"""Adapter for optum."""


class Adapter:
    vendor = "optum"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
