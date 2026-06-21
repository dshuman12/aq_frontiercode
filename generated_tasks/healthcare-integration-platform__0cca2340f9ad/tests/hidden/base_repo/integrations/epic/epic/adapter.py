"""Adapter for epic."""


class Adapter:
    vendor = "epic"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
