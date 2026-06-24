"""Core repositories module for terminology-service."""


class RepositoriesRegistry:
    namespace = "terminology-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "terminology-service"}
