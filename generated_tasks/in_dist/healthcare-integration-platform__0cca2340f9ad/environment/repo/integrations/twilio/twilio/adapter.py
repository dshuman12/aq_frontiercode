"""Adapter for twilio."""


class Adapter:
    vendor = "twilio"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
