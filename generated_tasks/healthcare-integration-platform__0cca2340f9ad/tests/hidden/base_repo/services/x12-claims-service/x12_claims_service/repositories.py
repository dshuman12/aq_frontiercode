"""Core repositories module for x12-claims-service."""


class RepositoriesRegistry:
    namespace = "x12-claims-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "x12-claims-service"}
