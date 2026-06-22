"""Core policies module for notification-service."""


class PoliciesRegistry:
    namespace = "notification-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "notification-service"}
