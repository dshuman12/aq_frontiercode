"""Core routes module for audit-log-service."""


class RoutesRegistry:
    namespace = "audit-log-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
