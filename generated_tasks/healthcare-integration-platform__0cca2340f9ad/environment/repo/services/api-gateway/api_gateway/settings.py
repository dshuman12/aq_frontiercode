"""Core settings module for api-gateway."""


class SettingsRegistry:
    namespace = "api-gateway.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
