"""Core events module for dicom-router."""


class EventsRegistry:
    namespace = "dicom-router.events"

    def describe(self) -> dict[str, str]:
        return {"namespace": self.namespace, "owner": "dicom-router"}
