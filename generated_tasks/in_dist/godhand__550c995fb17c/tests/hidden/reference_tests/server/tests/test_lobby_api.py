from __future__ import annotations

from urllib.parse import urlparse

from fastapi.testclient import TestClient
from server.app import create_app

from server.tests.conftest import (
    register_user,
    login_user,
    get_auth_csrf,
)


def create_and_login(client: TestClient, email: str):
    register_user(client, email=email, password="StrongPass123")
    return login_user(client, email=email, password="StrongPass123")


def create_lobby(client: TestClient, lobby_name: str, user_capacity: int = 4):
    csrf = get_auth_csrf(client)
    r = client.post(
        "/api/v1/lobbies",
        json={"lobby_name": lobby_name, "user_capacity": user_capacity},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert r.status_code == 201, r.text
    return r.json()["lobby"]


def get_lobby(client: TestClient, lobby_id: str):
    r = client.get(f"/api/v1/lobbies/{lobby_id}")
    assert r.status_code == 200, r.text
    return r.json()["lobby"]


def assert_ws_route(value: str, expected_path: str):
    parsed = urlparse(value)
    assert parsed.scheme in {"ws", "wss", "http", "https"}
    assert parsed.path.endswith(expected_path)


def test_create_lobby_requires_auth():
    app = create_app()
    with TestClient(app) as client:
        r = client.post("/api/v1/lobbies", json={"lobby_name": "x", "user_capacity": 4})
        assert r.status_code in (401, 403)


def test_create_lobby_sets_owner_and_defaults():
    app = create_app()
    with TestClient(app) as client:
        me = create_and_login(client, "owner@example.com")
        lobby = create_lobby(client, "test-lobby-1", user_capacity=4)

        assert lobby["lobby_name"] == "test-lobby-1"
        assert lobby["owner_user_id"] == me["_id"]
        assert lobby["user_capacity"] == 4
        assert lobby["players"] == [me["_id"]]
        assert lobby["world_snapshot"] is None
        assert "_id" in lobby


def test_join_and_leave_flow():
    """
    Verifies:
      - POST /api/v1/lobbies/{lobby_id}/join adds the user to players
      - POST /api/v1/lobbies/{lobby_id}/leave removes the user
      - join returns 200 with {"lobby": ...}
    """
    app = create_app()
    with TestClient(app) as client:
        owner = create_and_login(client, "owner2@example.com")
        lobby = create_lobby(client, "join-leave-lobby", user_capacity=4)
        lobby_id = lobby["_id"]

        # second user registers and logs in
        bob = create_and_login(client, "bob@example.com")

        # bob joins
        csrf = get_auth_csrf(client)
        r = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
        assert r.status_code == 200, r.text
        returned = r.json()
        assert "lobby" in returned

        lobby_after_join = get_lobby(client, lobby_id)
        assert bob["_id"] in (lobby_after_join.get("players") or [])

        # bob leaves
        csrf = get_auth_csrf(client)
        r = client.post(f"/api/v1/lobbies/{lobby_id}/leave", headers={"X-CSRF-TOKEN": csrf})
        assert r.status_code == 200, r.text
        returned = r.json()
        assert "lobby" in returned

        lobby_after_leave = get_lobby(client, lobby_id)
        assert bob["_id"] not in (lobby_after_leave.get("players") or [])

        # owner remains owner
        assert lobby_after_leave["owner_user_id"] == owner["_id"]


def test_join_returns_default_ws_urls_when_registry_is_empty():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "owner3@example.com")
        lobby = create_lobby(client, "default-routing-lobby", user_capacity=4)
        lobby_id = lobby["_id"]

        create_and_login(client, "joiner3@example.com")
        csrf = get_auth_csrf(client)
        response = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
        assert response.status_code == 200, response.text

        payload = response.json()
        assert_ws_route(payload["gameWsUrl"], f"/api/v1/ws/game/{lobby_id}")
        assert_ws_route(payload["chatWsUrl"], f"/api/v1/ws/lobby/{lobby_id}")
        assert payload["lobby"]["assigned_game_server_id"] in {"game-server-default", "test-game-server"}


def test_list_lobbies_defaults_to_official_servers():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "viewer@example.com")

        response = client.get("/api/v1/lobbies")
        assert response.status_code == 200, response.text

        payload = response.json()
        assert "lobbies" in payload
        assert isinstance(payload["lobbies"], list)
        assert len(payload["lobbies"]) >= 1

        first_lobby = payload["lobbies"][0]
        assert first_lobby["kind"] == "official"
        assert isinstance(first_lobby["players"], list)
        assert "playerCount" in first_lobby
