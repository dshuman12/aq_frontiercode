"""Adapter for meditech."""


class Adapter:
    vendor = "meditech"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
