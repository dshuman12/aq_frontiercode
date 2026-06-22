"""Core policies module for x12-claims-service."""


class PoliciesRegistry:
    namespace = "x12-claims-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
