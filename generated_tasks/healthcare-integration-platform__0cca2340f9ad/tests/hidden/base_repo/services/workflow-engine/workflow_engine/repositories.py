"""Core repositories module for workflow-engine."""


class RepositoriesRegistry:
    namespace = "workflow-engine.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
