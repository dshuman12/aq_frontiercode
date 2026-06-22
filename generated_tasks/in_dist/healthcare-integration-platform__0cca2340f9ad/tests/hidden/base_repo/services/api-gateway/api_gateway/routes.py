"""Core routes module for api-gateway."""


class RoutesRegistry:
    namespace = "api-gateway.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
