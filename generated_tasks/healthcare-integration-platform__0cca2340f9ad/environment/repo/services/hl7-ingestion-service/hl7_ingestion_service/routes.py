"""Core routes module for hl7-ingestion-service."""


class RoutesRegistry:
    namespace = "hl7-ingestion-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
