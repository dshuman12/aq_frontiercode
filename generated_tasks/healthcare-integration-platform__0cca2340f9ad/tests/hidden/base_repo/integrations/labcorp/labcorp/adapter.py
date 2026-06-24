"""Adapter for labcorp."""


class Adapter:
    vendor = "labcorp"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
