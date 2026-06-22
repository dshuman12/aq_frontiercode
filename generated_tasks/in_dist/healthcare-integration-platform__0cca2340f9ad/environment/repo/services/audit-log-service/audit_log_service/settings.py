"""Core settings module for audit-log-service."""


class SettingsRegistry:
    namespace = "audit-log-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
