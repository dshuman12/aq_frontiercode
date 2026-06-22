"""
nexusflow.api.router
~~~~~~~~~~~~~~~~~~~~

Dynamic route registry with path parameter extraction, middleware
chaining, and HTTP method dispatching. Supports route groups, prefix
mounting, and request lifecycle hooks.

BUG CANDIDATE #5: Path parameter extraction fails when the URL
contains URL-encoded values (e.g., %20, %2F). The regex-based
extraction does not decode percent-encoded characters before matching.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Pattern,
    Set,
    Tuple,
    Type,
    Union,
)


class HTTPMethod(Enum):
    """Supported HTTP methods."""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


class Request:
    """Simple request object for the router."""

    def __init__(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        body: Any = None,
        query_params: Optional[Dict[str, str]] = None,
    ) -> None:
        self.method = method.upper()
        self.path = path
        self.headers = headers or {}
        self.body = body
        self.query_params = query_params or {}
        self.path_params: Dict[str, str] = {}
        self.state: Dict[str, Any] = {}

    def __repr__(self) -> str:
        return f"Request({self.method} {self.path})"


class Response:
    """Simple response object."""

    def __init__(
        self,
        status_code: int = 200,
        body: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.status_code = status_code
        self.body = body
        self.headers = headers or {"Content-Type": "application/json"}

    def json(self) -> Dict[str, Any]:
        if isinstance(self.body, dict):
            return self.body
        return {"data": self.body}

    def __repr__(self) -> str:
        return f"Response(status={self.status_code})"


HandlerFunc = Callable[[Request], Response]
MiddlewareFunc = Callable[[Request, Callable], Response]


class Route:
    """A single route definition."""

    def __init__(
        self,
        path: str,
        handler: HandlerFunc,
        methods: Optional[Set[str]] = None,
        name: Optional[str] = None,
        middleware: Optional[List[MiddlewareFunc]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.path = path
        self.handler = handler
        self.methods = methods or {"GET"}
        self.name = name or handler.__name__
        self.middleware = middleware or []
        self.metadata = metadata or {}
        self._param_names: List[str] = []
        self._pattern: Optional[Pattern] = None
        self._compile()

    def _compile(self) -> None:
        """
        Compile the path pattern into a regex.

        BUG CANDIDATE #5: The regex matching is performed against
        the raw URL path. URL-encoded characters like %20 (space)
        or %2F (slash) are NOT decoded before matching, so path
        params may contain encoded values or fail to match entirely.
        """
        pattern = self.path
        param_re = re.compile(r"\{(\w+)(?::([^}]+))?\}")
        params = param_re.findall(pattern)

        regex = pattern
        for param_name, param_type in params:
            self._param_names.append(param_name)
            if param_type == "int":
                regex = regex.replace(
                    f"{{{param_name}:{param_type}}}",
                    f"(?P<{param_name}>\\d+)",
                )
            elif param_type == "path":
                regex = regex.replace(
                    f"{{{param_name}:{param_type}}}",
                    f"(?P<{param_name}>.+)",
                )
            else:
                regex = regex.replace(
                    f"{{{param_name}}}",
                    f"(?P<{param_name}>[^/]+)",
                )

        # BUG: No URL decoding is applied to the path before matching.
        # If the URL contains %20 or other encoded chars, the param
        # extraction will return the encoded form (e.g., "hello%20world")
        self._pattern = re.compile(f"^{regex}$")

    def match(self, path: str) -> Optional[Dict[str, str]]:
        """
        Match a request path against this route.

        Returns extracted params dict or None if no match.
        """
        if self._pattern is None:
            return None
        # BUG: path is not URL-decoded before matching
        m = self._pattern.match(path)
        if m:
            return m.groupdict()
        return None

    def __repr__(self) -> str:
        return f"Route({self.path!r}, methods={self.methods})"


class RouteGroup:
    """Groups routes under a common prefix with shared middleware."""

    def __init__(
        self,
        prefix: str = "",
        middleware: Optional[List[MiddlewareFunc]] = None,
        name_prefix: str = "",
    ) -> None:
        self.prefix = prefix.rstrip("/")
        self.middleware = middleware or []
        self.name_prefix = name_prefix
        self._routes: List[Route] = []

    def route(
        self,
        path: str,
        methods: Optional[Set[str]] = None,
        name: Optional[str] = None,
        middleware: Optional[List[MiddlewareFunc]] = None,
    ) -> Callable:
        """Decorator to register a route in this group."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            full_path = self.prefix + path
            route_name = name or (
                f"{self.name_prefix}.{func.__name__}"
                if self.name_prefix
                else func.__name__
            )
            combined_middleware = self.middleware + (middleware or [])
            route = Route(
                full_path,
                func,
                methods=methods,
                name=route_name,
                middleware=combined_middleware,
            )
            self._routes.append(route)
            return func
        return decorator

    def get_routes(self) -> List[Route]:
        return list(self._routes)


class Router:
    """
    Main router that handles route registration, matching, and dispatch.
    """

    def __init__(self) -> None:
        self._routes: List[Route] = []
        self._named_routes: Dict[str, Route] = {}
        self._global_middleware: List[MiddlewareFunc] = []
        self._error_handlers: Dict[int, HandlerFunc] = {}
        self._before_request: List[Callable[[Request], Optional[Response]]] = []
        self._after_request: List[Callable[[Request, Response], Response]] = []
        self._not_found_handler: Optional[HandlerFunc] = None
        self._method_not_allowed_handler: Optional[HandlerFunc] = None

    def add_route(
        self,
        path: str,
        handler: HandlerFunc,
        methods: Optional[Set[str]] = None,
        name: Optional[str] = None,
        middleware: Optional[List[MiddlewareFunc]] = None,
    ) -> Route:
        """Register a new route."""
        route = Route(path, handler, methods=methods, name=name, middleware=middleware)
        self._routes.append(route)
        if route.name:
            self._named_routes[route.name] = route
        return route

    def get(self, path: str, **kwargs: Any) -> Callable:
        """Decorator for GET routes."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self.add_route(path, func, methods={"GET"}, **kwargs)
            return func
        return decorator

    def post(self, path: str, **kwargs: Any) -> Callable:
        """Decorator for POST routes."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self.add_route(path, func, methods={"POST"}, **kwargs)
            return func
        return decorator

    def put(self, path: str, **kwargs: Any) -> Callable:
        """Decorator for PUT routes."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self.add_route(path, func, methods={"PUT"}, **kwargs)
            return func
        return decorator

    def delete(self, path: str, **kwargs: Any) -> Callable:
        """Decorator for DELETE routes."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self.add_route(path, func, methods={"DELETE"}, **kwargs)
            return func
        return decorator

    def mount(self, group: RouteGroup) -> None:
        """Mount a route group onto this router."""
        for route in group.get_routes():
            self._routes.append(route)
            if route.name:
                self._named_routes[route.name] = route

    def use(self, middleware: MiddlewareFunc) -> None:
        """Add global middleware."""
        self._global_middleware.append(middleware)

    def before(self, hook: Callable[[Request], Optional[Response]]) -> None:
        """Add a before-request hook."""
        self._before_request.append(hook)

    def after(self, hook: Callable[[Request, Response], Response]) -> None:
        """Add an after-request hook."""
        self._after_request.append(hook)

    def error_handler(self, status_code: int) -> Callable:
        """Decorator to register an error handler."""
        def decorator(func: HandlerFunc) -> HandlerFunc:
            self._error_handlers[status_code] = func
            return func
        return decorator

    def _find_route(
        self, method: str, path: str
    ) -> Tuple[Optional[Route], Dict[str, str]]:
        """Find a matching route for the given method and path."""
        method_matches: List[Route] = []
        for route in self._routes:
            params = route.match(path)
            if params is not None:
                if method in route.methods:
                    return route, params
                method_matches.append(route)

        if method_matches:
            # Path matched but method didn't
            return None, {"_method_not_allowed": "true"}
        return None, {}

    def _apply_middleware(
        self,
        request: Request,
        handler: HandlerFunc,
        middleware_chain: List[MiddlewareFunc],
    ) -> Response:
        """Apply middleware chain around a handler."""
        if not middleware_chain:
            return handler(request)

        def build_chain(idx: int) -> Callable[[Request], Response]:
            if idx >= len(middleware_chain):
                return handler

            def next_handler(req: Request) -> Response:
                return build_chain(idx + 1)(req)

            def wrapped(req: Request) -> Response:
                return middleware_chain[idx](req, next_handler)

            return wrapped

        chain = build_chain(0)
        return chain(request)

    def dispatch(self, request: Request) -> Response:
        """
        Dispatch a request to the appropriate handler.

        Runs the full request lifecycle: before hooks -> middleware -> handler -> after hooks.
        """
        # Run before-request hooks
        for hook in self._before_request:
            early_response = hook(request)
            if early_response is not None:
                return early_response

        # Find route
        route, params = self._find_route(request.method, request.path)

        if route is None:
            if "_method_not_allowed" in params:
                if self._method_not_allowed_handler:
                    return self._method_not_allowed_handler(request)
                return Response(405, {"error": "Method Not Allowed"})
            if self._not_found_handler:
                return self._not_found_handler(request)
            return Response(404, {"error": "Not Found"})

        # Set path params on request
        request.path_params = params

        # Build middleware chain: global + route-specific
        middleware_chain = self._global_middleware + route.middleware

        try:
            response = self._apply_middleware(
                request, route.handler, middleware_chain
            )
        except Exception as e:
            if 500 in self._error_handlers:
                return self._error_handlers[500](request)
            return Response(500, {"error": str(e)})

        # Run after-request hooks
        for hook in self._after_request:
            response = hook(request, response)

        return response

    def url_for(self, name: str, **params: Any) -> Optional[str]:
        """Generate a URL for a named route."""
        route = self._named_routes.get(name)
        if route is None:
            return None
        path = route.path
        for key, value in params.items():
            path = re.sub(
                rf"\{{{key}(?::[^}}]+)?\}}", str(value), path
            )
        return path

    def get_routes(self) -> List[Dict[str, Any]]:
        """Return metadata for all registered routes."""
        return [
            {
                "path": r.path,
                "methods": sorted(r.methods),
                "name": r.name,
                "metadata": r.metadata,
            }
            for r in self._routes
        ]

    def __repr__(self) -> str:
        return f"Router(routes={len(self._routes)})"
