"""Adapter for cerner."""


class Adapter:
    vendor = "cerner"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
