from __future__ import annotations

import json
import pytest

from starlette.websockets import WebSocketDisconnect
from fastapi.testclient import TestClient

from server.app import create_app
from server.domain.messaging.rules import MAX_MESSAGE_LENGTH
from server.tests.conftest import (
    get_auth_csrf,
    login_user,
    register_user,
)


def _json_recv(ws):
    payload = ws.receive_json()
    assert isinstance(payload, dict)
    return payload


def _recv_next_non_history(ws, limit: int = 10):
    last = None
    for _ in range(limit):
        last = _json_recv(ws)
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


def _recv_until_system_text(ws, expected_text: str, limit: int = 10):
    last = None
    for _ in range(limit):
        last = _recv_next_non_history(ws, limit=1)
        if last.get("type") == "system" and last.get("text") == expected_text:
            return last
    raise AssertionError(f"Did not receive system text {expected_text}. Last payload: {last}")


def _create_and_login(client: TestClient, email: str) -> str:
    register_user(client, email=email, password="StrongPass123")
    user = login_user(client, email=email, password="StrongPass123")
    return user["username"]


def _create_lobby(client: TestClient, lobby_name: str = "ws-lobby", user_capacity: int = 4) -> str:
    csrf = get_auth_csrf(client)
    r = client.post(
        "/api/v1/lobbies",
        json={"lobby_name": lobby_name, "user_capacity": user_capacity},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert r.status_code == 201, r.text
    return r.json()["lobby"]["_id"]


def _join_lobby(client: TestClient, lobby_id: str) -> None:
    csrf = get_auth_csrf(client)
    r = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
    assert r.status_code == 200, r.text


def test_ws_connect_without_auth_is_rejected():
    app = create_app()
    with TestClient(app) as client:
        try:
            with client.websocket_connect("/api/v1/ws/lobby/test-lobby") as ws:
                with pytest.raises(WebSocketDisconnect) as exc_info:
                    ws.receive_text()
                assert exc_info.value.code == 1008
        except WebSocketDisconnect as exc:
            assert exc.code == 1008


def test_connect_emits_join_system_message_with_count():
    app = create_app()
    with TestClient(app) as client:
        username = _create_and_login(client, "alice@example.com")

        lobby_id = _create_lobby(client, "test-lobby")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws:
            msg = _recv_next_non_history(ws)
            assert msg["type"] == "system"
            assert msg["lobbyId"] == lobby_id
            assert msg["text"] == f"{username} joined"
            assert msg["count"] == 1
            assert isinstance(msg["ts"], int)


def test_two_clients_receive_chat_broadcast_and_sender_is_not_spoofable():
    app = create_app()
    with TestClient(app) as client:
        username_alice = _create_and_login(client, "alice@example.com")

        lobby_id = _create_lobby(client, "lobby-two-clients")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws1:
            msg = _recv_next_non_history(ws1)
            assert msg["type"] == "system"
            assert msg["text"] == "alice joined"

            _create_and_login(client, "bob@example.com")
            _join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws2:
                msg_bob = _recv_next_non_history(ws2)
                assert msg_bob["type"] == "system"
                assert msg_bob["text"] == "bob joined"

                msg_alice = _recv_until_system_text(ws1, "bob joined")
                assert msg_alice["type"] == "system"

                ws1.send_json({"text": "hello from one", "user": "mallory"})
                err = _recv_until_type(ws1, "error")
                assert err["type"] == "error"
                assert err["code"] == "invalid_payload"

                ws1.send_json({"text": "hello from one"})

                msg1 = _recv_until_type(ws1, "chat")
                msg2 = _recv_until_type(ws2, "chat")
                for msg in (msg1, msg2):
                    assert msg["type"] == "chat"
                    assert msg["lobbyId"] == lobby_id
                    assert msg["user"] == username_alice
                    assert msg["text"] == "hello from one"
                    assert isinstance(msg["ts"], int)


def test_invalid_payload_and_invalid_message_emit_error_events():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "neo@example.com")

        lobby_id = _create_lobby(client, "invalid-payload")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws:
            join_msg = _recv_next_non_history(ws)
            assert join_msg["type"] == "system"
            assert join_msg["text"] == "neo joined"

            ws.send_text("not-json")
            err = _recv_until_type(ws, "error")
            assert err["type"] == "error"
            assert err["code"] == "invalid_payload"

            ws.send_json({"text": "   "})
            err = _recv_until_type(ws, "error")
            assert err["type"] == "error"
            assert err["code"] == "invalid_message"

            ws.send_json({"text": "x" * (MAX_MESSAGE_LENGTH + 1)})
            err = _recv_until_type(ws, "error")
            assert err["type"] == "error"
            assert err["code"] == "invalid_message"

            ws.send_text(json.dumps({"text": "valid"}))
            msg = _recv_until_type(ws, "chat")
            assert msg["type"] == "chat"
            assert msg["lobbyId"] == lobby_id
            assert msg["text"] == "valid"


def test_disconnect_emits_leave_message_with_updated_count():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "alice@example.com")

        lobby_id = _create_lobby(client, "disconnect-test")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws1:
            join1 = _recv_next_non_history(ws1)
            assert join1["type"] == "system"
            assert join1["text"] == "alice joined"

            _create_and_login(client, "bob@example.com")
            _join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws2:
                join2 = _recv_next_non_history(ws2)
                assert join2["type"] == "system"
                assert join2["text"] == "bob joined"

                bob_join_for_alice = _recv_until_system_text(ws1, "bob joined")
                assert bob_join_for_alice["type"] == "system"

            leave = _recv_until_system_text(ws1, "bob left")
            assert leave["type"] == "system"
            assert leave["lobbyId"] == lobby_id
            assert leave["text"] == "bob left"
            assert leave["count"] == 1
            assert isinstance(leave["ts"], int)


def test_same_user_reconnect_replaces_socket_without_presence_churn():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "alice@example.com")

        lobby_id = _create_lobby(client, "reconnect-test")

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws1:
            join1 = _recv_next_non_history(ws1)
            assert join1["type"] == "system"
            assert join1["text"] == "alice joined"

            _create_and_login(client, "bob@example.com")
            _join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws2:
                join2 = _recv_next_non_history(ws2)
                assert join2["type"] == "system"
                assert join2["text"] == "bob joined"

                bob_join_for_alice = _recv_until_system_text(ws1, "bob joined")
                assert bob_join_for_alice["type"] == "system"

                login_user(client, email="alice@example.com", password="StrongPass123")

                with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws3:
                    with pytest.raises(WebSocketDisconnect) as exc_info:
                        ws1.receive_text()
                    assert exc_info.value.code == 1008

                    ws3.send_json({"text": "after reconnect"})
                    msg = _recv_until_type(ws2, "chat")
                    assert msg["type"] == "chat"
                    assert msg["lobbyId"] == lobby_id
                    assert msg["user"] == "alice"
                    assert msg["text"] == "after reconnect"