"""Adapter for sendgrid."""


class Adapter:
    vendor = "sendgrid"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
