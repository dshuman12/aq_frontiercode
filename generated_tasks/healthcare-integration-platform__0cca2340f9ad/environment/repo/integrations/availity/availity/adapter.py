"""Adapter for availity."""


class Adapter:
    vendor = "availity"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
