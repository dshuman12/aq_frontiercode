"""Core models module for dicom-router."""


class ModelsRegistry:
    namespace = "dicom-router.models"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
