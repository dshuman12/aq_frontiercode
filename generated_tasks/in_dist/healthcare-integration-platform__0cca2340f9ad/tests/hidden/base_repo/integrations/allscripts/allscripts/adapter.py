"""Adapter for allscripts."""


class Adapter:
    vendor = "allscripts"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
