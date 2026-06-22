"""Core repositories module for auth-service."""


class RepositoriesRegistry:
    namespace = "auth-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "auth-service"}
