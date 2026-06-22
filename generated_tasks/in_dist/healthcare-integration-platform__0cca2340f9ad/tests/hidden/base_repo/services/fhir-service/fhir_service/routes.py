"""Core routes module for fhir-service."""


class RoutesRegistry:
    namespace = "fhir-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
