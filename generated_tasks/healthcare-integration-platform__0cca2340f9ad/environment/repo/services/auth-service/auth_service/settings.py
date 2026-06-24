"""Core settings module for auth-service."""


class SettingsRegistry:
    namespace = "auth-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
