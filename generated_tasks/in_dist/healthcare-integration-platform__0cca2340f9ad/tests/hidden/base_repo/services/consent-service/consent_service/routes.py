"""Core routes module for consent-service."""


class RoutesRegistry:
    namespace = "consent-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
