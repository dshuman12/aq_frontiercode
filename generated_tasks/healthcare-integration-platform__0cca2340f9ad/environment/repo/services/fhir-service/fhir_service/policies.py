"""Core policies module for fhir-service."""


class PoliciesRegistry:
    namespace = "fhir-service.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "fhir-service"}
