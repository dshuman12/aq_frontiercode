"""Core routes module for file-storage-service."""


class RoutesRegistry:
    namespace = "file-storage-service.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "file-storage-service"}
