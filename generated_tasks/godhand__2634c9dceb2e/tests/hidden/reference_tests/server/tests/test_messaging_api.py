from __future__ import annotations

from fastapi.testclient import TestClient

from server.app import create_app
from server.tests.conftest import (
    get_auth_csrf,
    get_latest_verification_token,
    login_user,
    register_user,
    verify_email_token,
)


def _create_and_login(client: TestClient, email: str) -> str:
    register_user(client, email=email, password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    user = login_user(client, email=email, password="StrongPass123")
    return user["username"]


def test_get_lobby_status_returns_count_zero_initially():
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/v1/messaging/lobbies/test-lobby")
        assert r.status_code == 200
        data = r.json()
        assert data["lobbyId"] == "test-lobby"
        assert data["count"] == 0


def test_send_message_endpoint_accepts_valid_message():
    app = create_app()
    with TestClient(app) as client:
        username = _create_and_login(client, "alice@example.com")
        csrf = get_auth_csrf(client)
        r = client.post(
            "/api/v1/messaging/lobbies/l1/messages",
            json={"text": "hello"},
            headers={"X-CSRF-TOKEN": csrf},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["event"] == "message"
        assert data["lobbyId"] == "l1"
        assert data["user"] == username


def test_send_message_endpoint_returns_400_on_invalid_message():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "alice@example.com")
        csrf = get_auth_csrf(client)
        r = client.post(
            "/api/v1/messaging/lobbies/l1/messages",
            json={"text": "   "},  # invalid per domain rules
            headers={"X-CSRF-TOKEN": csrf},
        )
        assert r.status_code == 400  # DomainValidationError should map to 400


def test_send_message_endpoint_requires_authentication():
    app = create_app()
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/messaging/lobbies/l1/messages",
            json={"text": "hello"},
        )
        assert r.status_code == 401


def test_rest_send_message_broadcasts_to_ws_clients():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "bob@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/l1") as ws:
            ws.receive_json()  # initial join message
            csrf = get_auth_csrf(client)

            r = client.post(
                "/api/v1/messaging/lobbies/l1/messages",
                json={"text": "hello via rest"},
                headers={"X-CSRF-TOKEN": csrf},
            )
            assert r.status_code == 200

            msg = ws.receive_json()
            assert msg["type"] == "chat"
            assert msg["lobbyId"] == "l1"
            assert msg["user"] == "bob"
            assert msg["text"] == "hello via rest"
