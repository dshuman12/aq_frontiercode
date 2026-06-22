import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[2] / "services" / "claim-processing-service"
sys.path.insert(0, str(SERVICE_ROOT))

from claim_processing_service.pipeline import build_claim_event


def test_build_claim_event():
    event = build_claim_event("patient-1", "claim-1")
    assert event["eventType"] == "claim.submitted"
