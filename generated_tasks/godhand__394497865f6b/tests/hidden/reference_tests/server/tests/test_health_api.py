from __future__ import annotations


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert isinstance(payload.get("uptimeSeconds"), int)
    assert payload["uptimeSeconds"] >= 0


def test_ready_endpoint(client):
    response = client.get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["checks"]["mongo"]["status"] == "ok"
    assert isinstance(payload.get("uptimeSeconds"), int)
    assert payload["uptimeSeconds"] >= 0

