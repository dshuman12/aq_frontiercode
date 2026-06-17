from __future__ import annotations

from fastapi.testclient import TestClient

from server.app import create_app
from server.tests.conftest import (
    get_auth_csrf,
    login_user,
    register_user,
)


def _create_and_login(client: TestClient, email: str) -> str:
    register_user(client, email=email, password="StrongPass123")
    user = login_user(client, email=email, password="StrongPass123")
    return user["username"]


def _create_lobby(client: TestClient, lobby_name: str = "lobby-1") -> str:
    csrf = get_auth_csrf(client)
    r = client.post(
        "/api/v1/lobbies",
        json={"lobby_name": lobby_name, "user_capacity": 4},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert r.status_code == 201, r.text
    return r.json()["lobby"]["_id"]


def _recv_json(ws):
    payload = ws.receive_json()
    assert isinstance(payload, dict)
    return payload


def _recv_next_non_history(ws, limit: int = 10):
    last = None
    for _ in range(limit):
        last = _recv_json(ws)
        if last.get("type") != "history":
            return last
    raise AssertionError(f"Did not receive a non-history message. Last payload: {last}")


def _recv_until_type(ws, expected_type: str, limit: int = 10):
    last = None
    for _ in range(limit):
        last = _recv_next_non_history(ws, limit=1)
        if last.get("type") == expected_type:
            return last
    raise AssertionError(f"Did not receive event type {expected_type}. Last payload: {last}")


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
            json={"text": "   "},
            headers={"X-CSRF-TOKEN": csrf},
        )
        assert r.status_code == 400


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

        lobby_id = _create_lobby(client, "ws-broadcast-test")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws:
            join_msg = _recv_next_non_history(ws)
            assert join_msg["type"] == "system"
            assert join_msg["text"] == "bob joined"

            csrf = get_auth_csrf(client)
            r = client.post(
                f"/api/v1/messaging/lobbies/{lobby_id}/messages",
                json={"text": "hello via rest"},
                headers={"X-CSRF-TOKEN": csrf},
            )
            assert r.status_code == 200, r.text

            msg = _recv_until_type(ws, "chat")
            assert msg["type"] == "chat"
            assert msg["lobbyId"] == lobby_id
            assert msg["user"] == "bob"
            assert msg["text"] == "hello via rest"