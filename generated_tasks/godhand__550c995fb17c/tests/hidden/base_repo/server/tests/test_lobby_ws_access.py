from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from server.app import create_app
from server.tests.conftest import (
    register_user,
    login_user,
    get_auth_csrf,
)


def create_and_login(client: TestClient, email: str):
    register_user(client, email=email, password="StrongPass123")
    return login_user(client, email=email, password="StrongPass123")


def create_lobby(client: TestClient, lobby_name: str):
    csrf = get_auth_csrf(client)
    r = client.post(
        "/api/v1/lobbies",
        json={"lobby_name": lobby_name, "user_capacity": 4},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert r.status_code == 201, r.text
    return r.json()["lobby"]


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


def test_ws_rejects_if_not_joined():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "ownerws@example.com")
        lobby = create_lobby(client, "ws-access")
        lobby_id = lobby["_id"]

        create_and_login(client, "diffuser@example.com")

        try:
            with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws:
                with pytest.raises(WebSocketDisconnect) as exc_info:
                    ws.receive_text()
                assert exc_info.value.code == 1008
        except WebSocketDisconnect as exc:
            assert exc.code == 1008


def test_ws_allows_after_join_rest_then_ws():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "ownerws2@example.com")
        lobby = create_lobby(client, "ws-access-2")
        lobby_id = lobby["_id"]

        bob = create_and_login(client, "bobws@example.com")

        csrf = get_auth_csrf(client)
        r = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
        assert r.status_code == 200, r.text

        with client.websocket_connect(f"/api/v1/ws/lobby/{lobby_id}") as ws:
            msg = _recv_next_non_history(ws)
            assert msg["type"] == "system"
            assert msg["lobbyId"] == lobby_id
            assert bob["username"] in msg["text"]
