"""Core policies module for hl7-ingestion-service."""


class PoliciesRegistry:
    namespace = "hl7-ingestion-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "hl7-ingestion-service"}
