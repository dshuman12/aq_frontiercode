from __future__ import annotations

from fastapi.testclient import TestClient

from server.app import create_app


def test_get_lobby_status_returns_count_zero_initially():
    app = create_app()
    with TestClient(app) as client:
        r = client.get("/api/v1/messaging/lobbies/test-lobby")
        assert r.status_code == 200
        data = r.json()
        assert data["lobbyId"] == "test-lobby"
        assert data["count"] == 0


def test_join_endpoint_returns_ack_payload():
    app = create_app()
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/messaging/lobbies/l1/join",
            json={"username": "alice"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["event"] == "join"
        assert data["lobbyId"] == "l1"
        assert data["username"] == "alice"
        assert isinstance(data["count"], int)


def test_leave_endpoint_returns_ack_payload():
    app = create_app()
    with TestClient(app) as client:
        # leave without joining is still a valid "broadcast attempt" in your current code
        r = client.post(
            "/api/v1/messaging/lobbies/l1/leave",
            json={"username": "alice"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["event"] == "leave"
        assert data["lobbyId"] == "l1"
        assert data["username"] == "alice"
        assert isinstance(data["count"], int)


def test_send_message_endpoint_accepts_valid_message():
    app = create_app()
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/messaging/lobbies/l1/messages",
            json={"user": "alice", "text": "hello"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["event"] == "message"
        assert data["lobbyId"] == "l1"
        assert data["user"] == "alice"


def test_send_message_endpoint_returns_400_on_invalid_message():
    app = create_app()
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/messaging/lobbies/l1/messages",
            json={"user": "alice", "text": "   "},  # invalid per your domain rules
        )
        assert r.status_code == 400  # DomainValidationError should map to 400

def test_rest_send_message_broadcasts_to_ws_clients():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/l1?user=bob") as ws:
            ws.receive_json()  # initial join message

            r = client.post(
                "/api/v1/messaging/lobbies/l1/messages",
                json={"user": "alice", "text": "hello via rest"},
            )
            assert r.status_code == 200

            msg = ws.receive_json()
            assert msg["type"] == "chat"
            assert msg["lobbyId"] == "l1"
            assert msg["user"] == "alice"
            assert msg["text"] == "hello via rest"