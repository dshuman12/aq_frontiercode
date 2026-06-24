"""
nexusflow.api.versioning
~~~~~~~~~~~~~~~~~~~~~~~~

API versioning middleware supporting URL prefix, header-based, and
query parameter versioning strategies. Manages version lifecycle
including deprecation and sunset scheduling.

BUG CANDIDATE #8: Deprecated API versions still appear in the
generated schema/docs output. The deprecation flag is set but the
schema generation does not filter out deprecated versions.
"""

from __future__ import annotations

import datetime
import re
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


class VersionStatus(Enum):
    """Status of an API version."""
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    SUNSET = "sunset"
    BETA = "beta"


class VersionStrategy(Enum):
    """How the API version is communicated."""
    URL_PREFIX = "url_prefix"
    HEADER = "header"
    QUERY_PARAM = "query_param"


class APIVersion:
    """Represents a single API version."""

    def __init__(
        self,
        version: str,
        status: VersionStatus = VersionStatus.ACTIVE,
        deprecated_at: Optional[datetime.datetime] = None,
        sunset_at: Optional[datetime.datetime] = None,
        changelog: Optional[str] = None,
    ) -> None:
        self.version = version
        self.status = status
        self.deprecated_at = deprecated_at
        self.sunset_at = sunset_at
        self.changelog = changelog
        self._transforms: Dict[str, Callable] = {}

    def add_transform(self, route: str, transform: Callable) -> None:
        """Add a response transform for this version."""
        self._transforms[route] = transform

    def get_transform(self, route: str) -> Optional[Callable]:
        """Get the response transform for a route."""
        return self._transforms.get(route)

    @property
    def is_active(self) -> bool:
        return self.status == VersionStatus.ACTIVE

    @property
    def is_deprecated(self) -> bool:
        return self.status == VersionStatus.DEPRECATED

    @property
    def is_sunset(self) -> bool:
        if self.status == VersionStatus.SUNSET:
            return True
        if self.sunset_at and datetime.datetime.utcnow() > self.sunset_at:
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "version": self.version,
            "status": self.status.value,
        }
        if self.deprecated_at:
            result["deprecated_at"] = self.deprecated_at.isoformat()
        if self.sunset_at:
            result["sunset_at"] = self.sunset_at.isoformat()
        if self.changelog:
            result["changelog"] = self.changelog
        return result


class VersionRegistry:
    """Manages all API versions."""

    def __init__(self, default_version: str = "v1") -> None:
        self._versions: Dict[str, APIVersion] = {}
        self._default_version = default_version

    def register(
        self,
        version: str,
        status: VersionStatus = VersionStatus.ACTIVE,
        **kwargs: Any,
    ) -> APIVersion:
        """Register a new API version."""
        api_version = APIVersion(version, status, **kwargs)
        self._versions[version] = api_version
        return api_version

    def get(self, version: str) -> Optional[APIVersion]:
        """Get a registered version."""
        return self._versions.get(version)

    def deprecate(
        self,
        version: str,
        sunset_at: Optional[datetime.datetime] = None,
    ) -> None:
        """Mark a version as deprecated."""
        api_ver = self._versions.get(version)
        if api_ver:
            api_ver.status = VersionStatus.DEPRECATED
            api_ver.deprecated_at = datetime.datetime.utcnow()
            if sunset_at:
                api_ver.sunset_at = sunset_at

    def get_active_versions(self) -> List[APIVersion]:
        """Return only active versions."""
        return [v for v in self._versions.values() if v.is_active]

    def get_all_versions(self) -> List[APIVersion]:
        """Return all registered versions."""
        return list(self._versions.values())

    def get_schema(self) -> Dict[str, Any]:
        """
        Generate the versioning schema.

        BUG CANDIDATE #8: This includes ALL versions in the schema,
        including deprecated ones. The intent was to only show active
        versions, but the filter is missing.
        """
        # BUG: Should filter out deprecated/sunset versions
        # but returns all versions instead
        schema: Dict[str, Any] = {
            "default_version": self._default_version,
            "versions": {},
        }
        for name, version in self._versions.items():
            # Missing: if version.is_deprecated or version.is_sunset: continue
            schema["versions"][name] = version.to_dict()
        return schema

    @property
    def default_version(self) -> str:
        return self._default_version


class VersionMiddleware:
    """Middleware that extracts API version from requests."""

    def __init__(
        self,
        registry: VersionRegistry,
        strategy: VersionStrategy = VersionStrategy.URL_PREFIX,
        header_name: str = "X-API-Version",
        query_param: str = "api_version",
    ) -> None:
        self._registry = registry
        self._strategy = strategy
        self._header_name = header_name
        self._query_param = query_param

    def extract_version(self, request: Any) -> str:
        """Extract the API version from a request."""
        version: Optional[str] = None

        if self._strategy == VersionStrategy.URL_PREFIX:
            version = self._extract_from_url(request)
        elif self._strategy == VersionStrategy.HEADER:
            version = self._extract_from_header(request)
        elif self._strategy == VersionStrategy.QUERY_PARAM:
            version = self._extract_from_query(request)

        if version is None:
            version = self._registry.default_version

        return version

    def _extract_from_url(self, request: Any) -> Optional[str]:
        """Extract version from URL prefix like /v1/resource."""
        path = getattr(request, "path", "")
        match = re.match(r"^/(v\d+)(?:/|$)", path)
        if match:
            return match.group(1)
        return None

    def _extract_from_header(self, request: Any) -> Optional[str]:
        """Extract version from request header."""
        headers = getattr(request, "headers", {})
        return headers.get(self._header_name)

    def _extract_from_query(self, request: Any) -> Optional[str]:
        """Extract version from query parameter."""
        params = getattr(request, "query_params", {})
        return params.get(self._query_param)

    def __call__(self, request: Any, next_handler: Callable) -> Any:
        """Process the request, adding version info."""
        version_str = self.extract_version(request)
        api_version = self._registry.get(version_str)

        if api_version is None:
            from nexusflow.api.router import Response
            return Response(400, {"error": f"Unknown API version: {version_str}"})

        if api_version.is_sunset:
            from nexusflow.api.router import Response
            return Response(410, {
                "error": f"API version {version_str} has been sunset",
                "sunset_at": api_version.sunset_at.isoformat() if api_version.sunset_at else None,
            })

        # Attach version to request state
        if hasattr(request, "state"):
            request.state["api_version"] = version_str
            request.state["api_version_obj"] = api_version

        response = next_handler(request)

        # Add deprecation headers
        if api_version.is_deprecated:
            if hasattr(response, "headers"):
                response.headers["Deprecation"] = "true"
                if api_version.sunset_at:
                    response.headers["Sunset"] = api_version.sunset_at.isoformat()

        return response
