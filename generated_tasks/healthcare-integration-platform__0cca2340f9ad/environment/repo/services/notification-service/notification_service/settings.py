"""Core settings module for notification-service."""


class SettingsRegistry:
    namespace = "notification-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
