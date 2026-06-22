"""Core policies module for audit-log-service."""


class PoliciesRegistry:
    namespace = "audit-log-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "audit-log-service"}
