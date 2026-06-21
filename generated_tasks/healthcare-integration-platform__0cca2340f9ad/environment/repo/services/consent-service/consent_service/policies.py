"""Core policies module for consent-service."""


class PoliciesRegistry:
    namespace = "consent-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
