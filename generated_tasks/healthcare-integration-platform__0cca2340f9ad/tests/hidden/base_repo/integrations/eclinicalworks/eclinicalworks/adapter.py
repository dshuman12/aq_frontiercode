"""Adapter for eclinicalworks."""


class Adapter:
    vendor = "eclinicalworks"

    def normalize(self, payload: dict) -> dict:
        return {"vendor": self.vendor, "payload": payload}
