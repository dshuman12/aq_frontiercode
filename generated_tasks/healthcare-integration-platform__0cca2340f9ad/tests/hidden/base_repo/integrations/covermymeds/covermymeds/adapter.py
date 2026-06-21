"""Adapter for covermymeds."""


class Adapter:
    vendor = "covermymeds"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
