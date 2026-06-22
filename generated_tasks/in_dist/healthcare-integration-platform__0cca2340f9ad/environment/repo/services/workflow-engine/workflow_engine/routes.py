"""Core routes module for workflow-engine."""


class RoutesRegistry:
    namespace = "workflow-engine.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
