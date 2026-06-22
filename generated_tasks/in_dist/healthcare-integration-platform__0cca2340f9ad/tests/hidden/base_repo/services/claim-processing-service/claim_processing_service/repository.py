"""Persistence boundary for claim processing."""


class ClaimRepository:
    def save_status(self, claim_id: str, status: str) -> dict[str, str]:
        return {"claimId": claim_id, "status": status}
