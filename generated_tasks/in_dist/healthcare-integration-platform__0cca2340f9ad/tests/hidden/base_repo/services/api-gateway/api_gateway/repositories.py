"""Core repositories module for api-gateway."""


class RepositoriesRegistry:
    namespace = "api-gateway.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "api-gateway"}
