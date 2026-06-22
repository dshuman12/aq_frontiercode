"""Adapter for surescripts."""


class Adapter:
    vendor = "surescripts"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
