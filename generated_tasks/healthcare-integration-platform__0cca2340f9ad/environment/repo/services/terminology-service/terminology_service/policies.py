"""Core policies module for terminology-service."""


class PoliciesRegistry:
    namespace = "terminology-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
