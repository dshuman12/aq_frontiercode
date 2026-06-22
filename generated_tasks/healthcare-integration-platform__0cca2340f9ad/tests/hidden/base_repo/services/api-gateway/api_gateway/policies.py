"""Core policies module for api-gateway."""


class PoliciesRegistry:
    namespace = "api-gateway.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
