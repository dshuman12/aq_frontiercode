"""Core models module for file-storage-service."""


class ModelsRegistry:
    namespace = "file-storage-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
