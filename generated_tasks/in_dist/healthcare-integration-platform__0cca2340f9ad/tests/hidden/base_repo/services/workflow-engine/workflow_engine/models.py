"""Core models module for workflow-engine."""


class ModelsRegistry:
    namespace = "workflow-engine.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
