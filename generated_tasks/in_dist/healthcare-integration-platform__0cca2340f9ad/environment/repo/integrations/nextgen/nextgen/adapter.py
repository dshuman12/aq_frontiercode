"""Adapter for nextgen."""


class Adapter:
    vendor = "nextgen"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
