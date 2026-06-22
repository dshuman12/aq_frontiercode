from __future__ import annotations

from fastapi.testclient import TestClient

from server.app import create_app


def _json_recv(ws):
    payload = ws.receive_json()
    assert isinstance(payload, dict)
    return payload


def test_connect_emits_join_system_message_with_count():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/test-lobby") as ws:
            msg = _json_recv(ws)
            assert msg["type"] == "system"
            assert msg["lobbyId"] == "test-lobby"
            assert msg["text"] == "Someone joined"
            assert msg["count"] == 1
            assert isinstance(msg["ts"], int)


def test_two_clients_receive_chat_broadcast():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/l1?user=alice") as ws1:
            _json_recv(ws1)
            with client.websocket_connect("/api/v1/ws/lobby/l1?user=bob") as ws2:
                _json_recv(ws2)
                _json_recv(ws1)

                ws1.send_json({"text": "hello from one"})
                msg1 = _json_recv(ws1)
                msg2 = _json_recv(ws2)

                for msg in (msg1, msg2):
                    assert msg["type"] == "chat"
                    assert msg["lobbyId"] == "l1"
                    assert msg["user"] == "alice"
                    assert msg["text"] == "hello from one"
                    assert isinstance(msg["ts"], int)


def test_malformed_json_falls_back_to_text():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/l2?user=neo") as ws:
            _json_recv(ws)
            ws.send_text("not-json")
            msg = _json_recv(ws)
            assert msg["type"] == "chat"
            assert msg["lobbyId"] == "l2"
            assert msg["user"] == "neo"
            assert msg["text"] == "not-json"


def test_empty_or_whitespace_messages_are_ignored():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/l3?user=alice") as ws1:
            _json_recv(ws1)
            with client.websocket_connect("/api/v1/ws/lobby/l3?user=bob") as ws2:
                _json_recv(ws2)
                _json_recv(ws1)

                ws1.send_json({"text": "   "})
                ws1.send_json({"text": "valid"})

                msg1 = _json_recv(ws1)
                msg2 = _json_recv(ws2)
                assert msg1["type"] == "chat"
                assert msg2["type"] == "chat"
                assert msg1["text"] == "valid"
                assert msg2["text"] == "valid"


def test_disconnect_emits_leave_message_with_updated_count():
    app = create_app()
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws/lobby/l4?user=alice") as ws1:
            _json_recv(ws1)
            with client.websocket_connect("/api/v1/ws/lobby/l4?user=bob") as ws2:
                _json_recv(ws2)
                _json_recv(ws1)
            leave = _json_recv(ws1)
            assert leave["type"] == "system"
            assert leave["lobbyId"] == "l4"
            assert leave["text"] == "bob left"
            assert leave["count"] == 1
            assert isinstance(leave["ts"], int)

