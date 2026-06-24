"""Core routes module for terminology-service."""


class RoutesRegistry:
    namespace = "terminology-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
