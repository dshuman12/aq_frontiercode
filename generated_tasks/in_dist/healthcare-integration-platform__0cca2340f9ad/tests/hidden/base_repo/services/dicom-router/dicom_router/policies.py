"""Core policies module for dicom-router."""


class PoliciesRegistry:
    namespace = "dicom-router.policies"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
