"""Core settings module for hl7-ingestion-service."""


class SettingsRegistry:
    namespace = "hl7-ingestion-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
