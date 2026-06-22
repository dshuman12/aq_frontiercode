"""Core settings module for fhir-service."""


class SettingsRegistry:
    namespace = "fhir-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
