def test_claim_submission_contract():
    payload = {"patientId": "patient-1", "claimId": "claim-1", "standard": "X12-837"}
    assert payload["standard"] == "X12-837"
