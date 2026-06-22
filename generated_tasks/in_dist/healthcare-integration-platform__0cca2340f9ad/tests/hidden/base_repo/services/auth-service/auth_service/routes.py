"""Core routes module for auth-service."""


class RoutesRegistry:
    namespace = "auth-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
