"""Adapter for change-healthcare."""


class Adapter:
    vendor = "change-healthcare"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
