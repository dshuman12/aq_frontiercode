"""Adapter for s3."""


class Adapter:
    vendor = "s3"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
