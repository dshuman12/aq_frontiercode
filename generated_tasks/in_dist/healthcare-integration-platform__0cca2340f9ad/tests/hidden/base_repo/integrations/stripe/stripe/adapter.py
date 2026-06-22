"""Adapter for stripe."""


class Adapter:
    vendor = "stripe"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
