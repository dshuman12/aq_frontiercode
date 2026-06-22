"""Claim processing runtime."""

from claim_processing_service.pipeline import build_claim_event


def health() -> dict[str, str]:
    return {"service": "claim-processing-service", "status": "ok"}


if __name__ == "__main__":
    print(build_claim_event("demo-patient", "demo-claim"))
