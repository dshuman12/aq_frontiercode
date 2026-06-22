"""Adapter for plaid."""


class Adapter:
    vendor = "plaid"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
