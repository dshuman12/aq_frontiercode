"""Core settings module for x12-claims-service."""


class SettingsRegistry:
    namespace = "x12-claims-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
