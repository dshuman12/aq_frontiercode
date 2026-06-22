"""Core settings module for terminology-service."""


class SettingsRegistry:
    namespace = "terminology-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
