"""Core policies module for file-storage-service."""


class PoliciesRegistry:
    namespace = "file-storage-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
