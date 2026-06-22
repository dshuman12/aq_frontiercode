"""Core settings module for file-storage-service."""


class SettingsRegistry:
    namespace = "file-storage-service.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
