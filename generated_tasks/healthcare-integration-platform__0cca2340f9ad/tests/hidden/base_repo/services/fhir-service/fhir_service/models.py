"""Core models module for fhir-service."""


class ModelsRegistry:
    namespace = "fhir-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
