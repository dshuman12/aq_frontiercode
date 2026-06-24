"""Core repositories module for file-storage-service."""


class RepositoriesRegistry:
    namespace = "file-storage-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
