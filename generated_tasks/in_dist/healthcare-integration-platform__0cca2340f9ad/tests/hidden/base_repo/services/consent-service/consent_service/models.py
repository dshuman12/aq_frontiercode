"""Core models module for consent-service."""


class ModelsRegistry:
    namespace = "consent-service.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "consent-service"}
