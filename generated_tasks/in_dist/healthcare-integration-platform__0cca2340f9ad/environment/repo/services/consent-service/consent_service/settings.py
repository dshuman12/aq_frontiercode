"""Core settings module for consent-service."""


class SettingsRegistry:
    namespace = "consent-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
