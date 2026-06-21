"""Core repositories module for fhir-service."""


class RepositoriesRegistry:
    namespace = "fhir-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
