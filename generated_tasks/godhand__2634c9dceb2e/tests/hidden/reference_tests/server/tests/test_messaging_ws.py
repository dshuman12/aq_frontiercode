from __future__ import annotations

import json

from starlette.websockets import WebSocketDisconnect
from fastapi.testclient import TestClient

from server.app import create_app
from server.domain.messaging.rules import MAX_MESSAGE_LENGTH
from server.tests.conftest import (
    get_latest_verification_token,
    login_user,
    register_user,
    verify_email_token,
)


def _json_recv(ws):
    payload = ws.receive_json()
    assert isinstance(payload, dict)
    return payload


def _create_and_login(client: TestClient, email: str) -> str:
    register_user(client, email=email, password="StrongPass123")
    token = get_latest_verification_token()
    verify_email_token(client, token=token)
    user = login_user(client, email=email, password="StrongPass123")
    return user["username"]


def test_ws_connect_without_auth_is_rejected():
    app = create_app()
    with TestClient(app) as client:
        try:
            with client.websocket_connect("/api/v1/ws/lobby/test-lobby") as ws:
                ws.receive_text()
        except WebSocketDisconnect as exc:
            assert exc.code == 1008
        else:
            assert False, "Expected websocket authentication rejection"


def test_connect_emits_join_system_message_with_count():
    app = create_app()
    with TestClient(app) as client:
        username = _create_and_login(client, "alice@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/test-lobby") as ws:
            msg = _json_recv(ws)
            assert msg["type"] == "system"
            assert msg["lobbyId"] == "test-lobby"
            assert msg["text"] == f"{username} joined"
            assert msg["count"] == 1
            assert isinstance(msg["ts"], int)


def test_two_clients_receive_chat_broadcast_and_sender_is_not_spoofable():
    app = create_app()
    with TestClient(app) as client:
        username_alice = _create_and_login(client, "alice@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/l1") as ws1:
            _json_recv(ws1)
            _create_and_login(client, "bob@example.com")
            with client.websocket_connect("/api/v1/ws/lobby/l1") as ws2:
                _json_recv(ws2)
                _json_recv(ws1)

                ws1.send_json({"text": "hello from one", "user": "mallory"})
                err = _json_recv(ws1)
                assert err["type"] == "error"
                assert err["code"] == "invalid_payload"

                ws1.send_json({"text": "hello from one"})

                msg1 = _json_recv(ws1)
                msg2 = _json_recv(ws2)
                for msg in (msg1, msg2):
                    assert msg["type"] == "chat"
                    assert msg["lobbyId"] == "l1"
                    assert msg["user"] == username_alice
                    assert msg["text"] == "hello from one"
                    assert isinstance(msg["ts"], int)


def test_invalid_payload_and_invalid_message_emit_error_events():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "neo@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/l2") as ws:
            _json_recv(ws)
            ws.send_text("not-json")
            err = _json_recv(ws)
            assert err["type"] == "error"
            assert err["code"] == "invalid_payload"

            ws.send_json({"text": "   "})
            err = _json_recv(ws)
            assert err["type"] == "error"
            assert err["code"] == "invalid_message"

            ws.send_json({"text": "x" * (MAX_MESSAGE_LENGTH + 1)})
            err = _json_recv(ws)
            assert err["type"] == "error"
            assert err["code"] == "invalid_message"

            ws.send_text(json.dumps({"text": "valid"}))
            msg = _json_recv(ws)
            assert msg["type"] == "chat"
            assert msg["text"] == "valid"


def test_disconnect_emits_leave_message_with_updated_count():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "alice@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/l4") as ws1:
            _json_recv(ws1)
            _create_and_login(client, "bob@example.com")
            with client.websocket_connect("/api/v1/ws/lobby/l4") as ws2:
                _json_recv(ws2)
                _json_recv(ws1)
            leave = _json_recv(ws1)
            assert leave["type"] == "system"
            assert leave["lobbyId"] == "l4"
            assert leave["text"] == "bob left"
            assert leave["count"] == 1
            assert isinstance(leave["ts"], int)


def test_same_user_reconnect_replaces_socket_without_presence_churn():
    app = create_app()
    with TestClient(app) as client:
        _create_and_login(client, "alice@example.com")
        with client.websocket_connect("/api/v1/ws/lobby/l5") as ws1:
            _json_recv(ws1)  # alice joined

            _create_and_login(client, "bob@example.com")
            with client.websocket_connect("/api/v1/ws/lobby/l5") as ws2:
                _json_recv(ws2)  # bob joined
                _json_recv(ws1)  # bob joined broadcast to alice

                login_user(client, email="alice@example.com", password="StrongPass123")
                with client.websocket_connect("/api/v1/ws/lobby/l5") as ws3:
                    # Previous alice socket should be replaced/closed.
                    try:
                        ws1.receive_text()
                    except WebSocketDisconnect as exc:
                        assert exc.code == 1008
                    else:
                        assert False, "Expected replaced socket to be closed"

                    # No queued presence churn should appear for bob.
                    ws3.send_json({"text": "after reconnect"})
                    msg = _json_recv(ws2)
                    assert msg["type"] == "chat"
                    assert msg["lobbyId"] == "l5"
                    assert msg["user"] == "alice"
                    assert msg["text"] == "after reconnect"
