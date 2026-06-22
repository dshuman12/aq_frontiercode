"""Core settings module for workflow-engine."""


class SettingsRegistry:
    namespace = "workflow-engine.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
