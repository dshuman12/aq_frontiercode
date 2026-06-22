"""Core routes module for x12-claims-service."""


class RoutesRegistry:
    namespace = "x12-claims-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
