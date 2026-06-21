"""Core repositories module for hl7-ingestion-service."""


class RepositoriesRegistry:
    namespace = "hl7-ingestion-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
