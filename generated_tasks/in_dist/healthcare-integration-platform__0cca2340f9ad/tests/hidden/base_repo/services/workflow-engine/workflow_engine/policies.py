"""Core policies module for workflow-engine."""


class PoliciesRegistry:
    namespace = "workflow-engine.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "workflow-engine"}
