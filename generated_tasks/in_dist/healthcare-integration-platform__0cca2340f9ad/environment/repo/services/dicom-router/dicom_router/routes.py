"""Core routes module for dicom-router."""


class RoutesRegistry:
    namespace = "dicom-router.routes"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
