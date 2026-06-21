"""Core settings module for dicom-router."""


class SettingsRegistry:
    namespace = "dicom-router.settings"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
