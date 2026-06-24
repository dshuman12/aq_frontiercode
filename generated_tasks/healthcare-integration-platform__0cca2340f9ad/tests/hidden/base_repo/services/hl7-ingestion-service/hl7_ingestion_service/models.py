"""Core models module for hl7-ingestion-service."""


class ModelsRegistry:
    namespace = "hl7-ingestion-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
