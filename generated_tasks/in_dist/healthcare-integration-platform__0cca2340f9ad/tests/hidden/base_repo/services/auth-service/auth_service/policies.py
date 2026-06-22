"""Core policies module for auth-service."""


class PoliciesRegistry:
    namespace = "auth-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
