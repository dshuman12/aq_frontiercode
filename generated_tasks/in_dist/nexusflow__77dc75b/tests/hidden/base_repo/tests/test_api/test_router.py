"""Tests for nexusflow.api.router.Router."""

import pytest

from nexusflow.api.router import (
    HTTPMethod,
    Request,
    Response,
    Route,
    RouteGroup,
    Router,
)


def hello_handler(req: Request) -> Response:
    return Response(200, body={"message": "hello"})


def user_handler(req: Request) -> Response:
    return Response(200, body={"user_id": req.path_params.get("id")})


def echo_handler(req: Request) -> Response:
    return Response(200, body=req.body)


class TestRouteRegistration:
    """Tests for registering routes."""

    def test_add_route(self):
        router = Router()
        route = router.add_route("/hello", hello_handler, methods={"GET"})
        assert route.path == "/hello"
        assert "GET" in route.methods

    def test_add_named_route(self):
        router = Router()
        router.add_route("/hello", hello_handler, name="hello_route")
        assert "hello_route" in router._named_routes

    def test_get_decorator(self):
        router = Router()

        @router.get("/items")
        def list_items(req):
            return Response(200)

        assert len(router._routes) == 1
        assert "GET" in router._routes[0].methods

    def test_post_decorator(self):
        router = Router()

        @router.post("/items")
        def create_item(req):
            return Response(201)

        assert "POST" in router._routes[0].methods

    def test_put_decorator(self):
        router = Router()

        @router.put("/items/{id}")
        def update_item(req):
            return Response(200)

        assert "PUT" in router._routes[0].methods

    def test_delete_decorator(self):
        router = Router()

        @router.delete("/items/{id}")
        def delete_item(req):
            return Response(204)

        assert "DELETE" in router._routes[0].methods


class TestPathMatching:
    """Tests for route path matching and parameter extraction."""

    def test_exact_path_match(self):
        route = Route("/hello", hello_handler)
        params = route.match("/hello")
        assert params is not None
        assert params == {}

    def test_path_no_match(self):
        route = Route("/hello", hello_handler)
        assert route.match("/goodbye") is None

    def test_path_param_extraction(self):
        route = Route("/users/{id}", user_handler)
        params = route.match("/users/42")
        assert params == {"id": "42"}

    def test_typed_path_param_int(self):
        route = Route("/users/{id:int}", user_handler)
        params = route.match("/users/42")
        assert params == {"id": "42"}
        # Non-integer should not match
        assert route.match("/users/abc") is None

    def test_path_param_type_path(self):
        route = Route("/files/{path:path}", hello_handler)
        params = route.match("/files/docs/readme.md")
        assert params == {"path": "docs/readme.md"}

    def test_multiple_path_params(self):
        route = Route("/users/{user_id}/posts/{post_id}", hello_handler)
        params = route.match("/users/1/posts/99")
        assert params == {"user_id": "1", "post_id": "99"}


class TestRouteGroup:
    """Tests for route groups."""

    def test_group_prefix(self):
        group = RouteGroup(prefix="/api/v1")

        @group.route("/users", methods={"GET"})
        def list_users(req):
            return Response(200)

        routes = group.get_routes()
        assert len(routes) == 1
        assert routes[0].path == "/api/v1/users"

    def test_mount_group(self):
        router = Router()
        group = RouteGroup(prefix="/api")

        @group.route("/items")
        def items(req):
            return Response(200)

        router.mount(group)
        assert any(r.path == "/api/items" for r in router._routes)

    def test_group_middleware(self):
        called = []

        def log_middleware(req, next_handler):
            called.append("log")
            return next_handler(req)

        group = RouteGroup(prefix="/api", middleware=[log_middleware])

        @group.route("/test")
        def test_route(req):
            return Response(200)

        routes = group.get_routes()
        assert log_middleware in routes[0].middleware


class TestRouterMiddleware:
    """Tests for router-level middleware and hooks."""

    def test_global_middleware(self):
        router = Router()
        calls = []

        def track_middleware(req, next_handler):
            calls.append("mw")
            return next_handler(req)

        router.use(track_middleware)
        assert len(router._global_middleware) == 1

    def test_before_request_hook(self):
        router = Router()
        before_calls = []

        def before_hook(req):
            before_calls.append(req.path)
            return None

        router.before(before_hook)
        assert len(router._before_request) == 1

    def test_after_request_hook(self):
        router = Router()
        after_calls = []

        def after_hook(req, resp):
            after_calls.append(resp.status_code)
            return resp

        router.after(after_hook)
        assert len(router._after_request) == 1

    def test_error_handler_registration(self):
        router = Router()

        @router.error_handler(404)
        def not_found(req):
            return Response(404, body={"error": "not found"})

        assert 404 in router._error_handlers


class TestRequestResponse:
    """Tests for Request and Response objects."""

    def test_request_defaults(self):
        req = Request("GET", "/")
        assert req.method == "GET"
        assert req.path == "/"
        assert req.headers == {}
        assert req.query_params == {}

    def test_request_uppercases_method(self):
        req = Request("post", "/api")
        assert req.method == "POST"

    def test_response_json(self):
        resp = Response(200, body={"key": "val"})
        assert resp.json() == {"key": "val"}

    def test_response_json_non_dict(self):
        resp = Response(200, body="text")
        assert resp.json() == {"data": "text"}

    def test_request_repr(self):
        req = Request("GET", "/hello")
        assert "GET" in repr(req)
        assert "/hello" in repr(req)
