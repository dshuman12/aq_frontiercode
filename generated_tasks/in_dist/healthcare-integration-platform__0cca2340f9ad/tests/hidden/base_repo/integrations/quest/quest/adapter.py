"""Adapter for quest."""


class Adapter:
    vendor = "quest"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
