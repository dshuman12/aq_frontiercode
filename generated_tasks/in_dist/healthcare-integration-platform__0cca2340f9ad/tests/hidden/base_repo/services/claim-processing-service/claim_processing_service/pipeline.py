"""Claim lifecycle pipeline helpers."""


def build_claim_event(patient_id: str, claim_id: str) -> dict[str, str]:
    return {
        "eventType": "claim.submitted",
        "patientId": patient_id,
        "claimId": claim_id,
        "standard": "X12-837",
    }
