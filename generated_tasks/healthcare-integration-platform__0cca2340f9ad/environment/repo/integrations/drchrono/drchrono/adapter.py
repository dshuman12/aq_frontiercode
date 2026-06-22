"""Adapter for drchrono."""


class Adapter:
    vendor = "drchrono"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
