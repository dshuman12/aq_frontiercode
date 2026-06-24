"""Core repositories module for consent-service."""


class RepositoriesRegistry:
    namespace = "consent-service.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
