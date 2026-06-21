"""
nexusflow.api.openapi
~~~~~~~~~~~~~~~~~~~~~

OpenAPI 3.0 schema generation from registered routes, models, and
validation schemas. Produces JSON or YAML-compatible schema dictionaries
for API documentation.
"""

from __future__ import annotations

import copy
import re
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Type


# Type mapping from Python types to OpenAPI types
PYTHON_TYPE_MAP: Dict[Type, Dict[str, str]] = {
    str: {"type": "string"},
    int: {"type": "integer"},
    float: {"type": "number"},
    bool: {"type": "boolean"},
    list: {"type": "array"},
    dict: {"type": "object"},
    bytes: {"type": "string", "format": "binary"},
}


class OpenAPISchema:
    """Generates OpenAPI 3.0 schema from application routes and models."""

    def __init__(
        self,
        title: str = "NexusFlow API",
        version: str = "1.0.0",
        description: str = "",
        base_url: str = "http://localhost:8000",
    ) -> None:
        self._title = title
        self._version = version
        self._description = description
        self._base_url = base_url
        self._paths: Dict[str, Dict[str, Any]] = {}
        self._components: Dict[str, Any] = {
            "schemas": {},
            "securitySchemes": {},
            "parameters": {},
            "responses": {},
        }
        self._tags: List[Dict[str, str]] = []
        self._security: List[Dict[str, List[str]]] = []

    def add_path(
        self,
        path: str,
        method: str,
        summary: str = "",
        description: str = "",
        operation_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        parameters: Optional[List[Dict[str, Any]]] = None,
        request_body: Optional[Dict[str, Any]] = None,
        responses: Optional[Dict[str, Dict[str, Any]]] = None,
        security: Optional[List[Dict[str, List[str]]]] = None,
        deprecated: bool = False,
    ) -> None:
        """Add a path operation to the schema."""
        if path not in self._paths:
            self._paths[path] = {}

        operation: Dict[str, Any] = {}
        if summary:
            operation["summary"] = summary
        if description:
            operation["description"] = description
        if operation_id:
            operation["operationId"] = operation_id
        if tags:
            operation["tags"] = tags
        if parameters:
            operation["parameters"] = parameters
        if request_body:
            operation["requestBody"] = request_body
        if responses:
            operation["responses"] = responses
        else:
            operation["responses"] = {
                "200": {"description": "Successful response"},
            }
        if security:
            operation["security"] = security
        if deprecated:
            operation["deprecated"] = True

        self._paths[path][method.lower()] = operation

    def add_schema(self, name: str, schema: Dict[str, Any]) -> None:
        """Add a component schema."""
        self._components["schemas"][name] = schema

    def add_schema_from_model(self, name: str, model_class: Any) -> None:
        """Generate a schema from a model class."""
        schema: Dict[str, Any] = {
            "type": "object",
            "properties": {},
            "required": [],
        }

        if hasattr(model_class, "_fields"):
            for field_name, field in model_class._fields.items():
                prop = self._field_to_property(field)
                schema["properties"][field_name] = prop
                if not field.nullable and not field.primary_key:
                    schema["required"].append(field_name)

        if not schema["required"]:
            del schema["required"]

        self._components["schemas"][name] = schema

    def _field_to_property(self, field: Any) -> Dict[str, Any]:
        """Convert a model field to an OpenAPI property."""
        type_map = {
            "string": {"type": "string"},
            "integer": {"type": "integer"},
            "float": {"type": "number", "format": "float"},
            "boolean": {"type": "boolean"},
            "datetime": {"type": "string", "format": "date-time"},
            "date": {"type": "string", "format": "date"},
            "uuid": {"type": "string", "format": "uuid"},
            "json": {"type": "object"},
            "text": {"type": "string"},
            "binary": {"type": "string", "format": "binary"},
            "enum": {"type": "string"},
        }

        field_type_str = field.field_type.value if hasattr(field.field_type, "value") else str(field.field_type)
        prop = type_map.get(field_type_str, {"type": "string"})
        prop = dict(prop)

        if field.max_length:
            prop["maxLength"] = field.max_length
        if field.min_length:
            prop["minLength"] = field.min_length
        if hasattr(field, "min_value") and field.min_value is not None:
            prop["minimum"] = field.min_value
        if hasattr(field, "max_value") and field.max_value is not None:
            prop["maximum"] = field.max_value
        if field.choices:
            prop["enum"] = field.choices
        if field.doc:
            prop["description"] = field.doc
        if field.nullable:
            prop["nullable"] = True

        return prop

    def add_security_scheme(
        self,
        name: str,
        scheme_type: str,
        **kwargs: Any,
    ) -> None:
        """Add a security scheme."""
        scheme: Dict[str, Any] = {"type": scheme_type}
        scheme.update(kwargs)
        self._components["securitySchemes"][name] = scheme

    def add_tag(self, name: str, description: str = "") -> None:
        """Add a tag definition."""
        tag: Dict[str, str] = {"name": name}
        if description:
            tag["description"] = description
        self._tags.append(tag)

    def add_global_security(self, scheme_name: str, scopes: Optional[List[str]] = None) -> None:
        """Add global security requirement."""
        self._security.append({scheme_name: scopes or []})

    def from_router(self, router: Any) -> None:
        """Generate schema from a router's registered routes."""
        for route_info in router.get_routes():
            path = self._convert_path(route_info["path"])
            params = self._extract_params(route_info["path"])

            for method in route_info["methods"]:
                self.add_path(
                    path=path,
                    method=method,
                    summary=route_info.get("name", ""),
                    parameters=params,
                    tags=route_info.get("metadata", {}).get("tags"),
                )

    @staticmethod
    def _convert_path(path: str) -> str:
        """Convert route path to OpenAPI path format."""
        return re.sub(r"\{(\w+)(?::[^}]+)?\}", r"{\1}", path)

    @staticmethod
    def _extract_params(path: str) -> List[Dict[str, Any]]:
        """Extract path parameters from a route pattern."""
        params: List[Dict[str, Any]] = []
        for match in re.finditer(r"\{(\w+)(?::(\w+))?\}", path):
            name = match.group(1)
            param_type = match.group(2) or "string"

            schema = {"type": "string"}
            if param_type == "int":
                schema = {"type": "integer"}

            params.append({
                "name": name,
                "in": "path",
                "required": True,
                "schema": schema,
            })
        return params

    def generate(self) -> Dict[str, Any]:
        """Generate the complete OpenAPI schema."""
        spec: Dict[str, Any] = {
            "openapi": "3.0.3",
            "info": {
                "title": self._title,
                "version": self._version,
            },
            "servers": [{"url": self._base_url}],
            "paths": self._paths,
        }

        if self._description:
            spec["info"]["description"] = self._description

        if self._tags:
            spec["tags"] = self._tags

        # Only include non-empty component sections
        components = {}
        for key, value in self._components.items():
            if value:
                components[key] = value
        if components:
            spec["components"] = components

        if self._security:
            spec["security"] = self._security

        return spec

    def to_json(self, indent: int = 2) -> str:
        """Generate JSON string of the schema."""
        import json
        return json.dumps(self.generate(), indent=indent, ensure_ascii=False)
