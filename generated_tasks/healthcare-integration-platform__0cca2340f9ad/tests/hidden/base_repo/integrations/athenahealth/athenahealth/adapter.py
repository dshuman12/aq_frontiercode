"""Adapter for athenahealth."""


class Adapter:
    vendor = "athenahealth"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
