"""Core repositories module for dicom-router."""


class RepositoriesRegistry:
    namespace = "dicom-router.repositories"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
