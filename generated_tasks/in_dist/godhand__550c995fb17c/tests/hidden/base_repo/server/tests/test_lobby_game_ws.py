from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from server.app import create_app
from server.tests.conftest import get_auth_csrf, login_user, register_user


def create_and_login(client: TestClient, email: str):
    register_user(client, email=email, password="StrongPass123")
    return login_user(client, email=email, password="StrongPass123")


def create_lobby(client: TestClient, lobby_name: str):
    csrf = get_auth_csrf(client)
    response = client.post(
        "/api/v1/lobbies",
        json={"lobby_name": lobby_name, "user_capacity": 4},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert response.status_code == 201, response.text
    return response.json()["lobby"]


def join_lobby(client: TestClient, lobby_id: str):
    csrf = get_auth_csrf(client)
    response = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
    assert response.status_code == 200, response.text


def recv_json(ws):
    payload = ws.receive_json()
    assert isinstance(payload, dict)
    return payload


def recv_until_type(ws, expected_type: str, max_messages: int = 80):
    for _ in range(max_messages):
        payload = recv_json(ws)
        if payload.get("type") == expected_type:
            return payload
    raise AssertionError(f"Did not receive payload type '{expected_type}' within {max_messages} messages.")


def expect_initial_sync(ws, lobby_id: str):
    snapshot_payload = None
    presence_payload = None
    bootstrap_payload = None

    for _ in range(120):
        payload = recv_json(ws)
        payload_type = payload.get("type")
        if payload_type == "snapshot":
            snapshot_payload = payload
        elif payload_type == "presence_batch":
            presence_payload = payload
        elif payload_type == "lockstep_bootstrap":
            bootstrap_payload = payload
        if snapshot_payload is not None and presence_payload is not None and bootstrap_payload is not None:
            break

    assert snapshot_payload is not None
    assert presence_payload is not None
    assert bootstrap_payload is not None

    assert snapshot_payload["lobbyId"] == lobby_id
    assert presence_payload["lobbyId"] == lobby_id
    assert isinstance(presence_payload["presences"], list)
    assert bootstrap_payload["lobbyId"] == lobby_id
    assert isinstance(bootstrap_payload["currentTick"], int)
    assert isinstance(bootstrap_payload["tickIntervalMs"], (int, float))
    assert 0 < float(bootstrap_payload["tickIntervalMs"]) <= 50

    return snapshot_payload, presence_payload, bootstrap_payload


def test_game_ws_rejects_if_not_joined():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "owner-game-ws@example.com")
        lobby = create_lobby(client, "game-ws-access")
        lobby_id = lobby["_id"]

        create_and_login(client, "not-in-lobby@example.com")

        try:
            with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws:
                with pytest.raises(WebSocketDisconnect) as exc_info:
                    ws.receive_text()
                assert exc_info.value.code == 1008
        except WebSocketDisconnect as exc:
            assert exc.code == 1008


def test_game_ws_state_sync_broadcasts_and_persists_snapshot():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "alice-game-ws@example.com")
        lobby = create_lobby(client, "game-ws-sync")
        lobby_id = lobby["_id"]

        with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws1:
            initial, presence_batch, _ = expect_initial_sync(ws1, lobby_id)
            assert initial["snapshot"] is None
            assert presence_batch["presences"] == []

            create_and_login(client, "bob-game-ws@example.com")
            join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws2:
                initial_second, second_presence_batch, _ = expect_initial_sync(ws2, lobby_id)
                assert initial_second["snapshot"] is None
                assert second_presence_batch["presences"] == []

                snapshot_payload = {
                    "version": 1,
                    "updatedAtMs": 12345,
                    "gameState": {
                        "valleySeed": 130013,
                        "belts": [],
                    },
                }

                ws1.send_json({"kind": "state_sync", "snapshot": snapshot_payload})

                ack = recv_until_type(ws1, "ack")
                assert ack["event"] == "state_sync"
                assert ack["lobbyId"] == lobby_id

                sync = recv_until_type(ws2, "state_sync")
                assert sync["lobbyId"] == lobby_id
                assert sync["snapshot"] == snapshot_payload

        deadline = time.time() + 2.5
        while True:
            persisted = client.get(f"/api/v1/lobbies/{lobby_id}")
            assert persisted.status_code == 200, persisted.text
            if persisted.json()["lobby"]["world_snapshot"] == snapshot_payload:
                break
            if time.time() >= deadline:
                assert persisted.json()["lobby"]["world_snapshot"] == snapshot_payload
            time.sleep(0.05)


def test_game_ws_presence_updates_and_clear():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "alice-game-presence@example.com")
        lobby = create_lobby(client, "game-ws-presence")
        lobby_id = lobby["_id"]

        with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws1:
            _, presence_batch, _ = expect_initial_sync(ws1, lobby_id)
            assert presence_batch["presences"] == []

            ws1.send_json(
                {
                    "kind": "presence_update",
                    "presence": {
                        "cursorCell": {"x": 3, "y": 4},
                        "placementCell": {"x": 5, "y": 6},
                        "placementBuildId": "conveyor",
                        "placementDirection": "right",
                    },
                }
            )

            create_and_login(client, "bob-game-presence@example.com")
            join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws2:
                _, second_presence_batch, _ = expect_initial_sync(ws2, lobby_id)
                assert len(second_presence_batch["presences"]) == 1
                assert second_presence_batch["presences"][0]["username"].startswith("alice")
                assert second_presence_batch["presences"][0]["cursorCell"] == {"x": 3, "y": 4}
                assert second_presence_batch["presences"][0]["placementCell"] == {"x": 5, "y": 6}

                ws2.send_json(
                    {
                        "kind": "presence_update",
                        "presence": {
                            "cursorCell": {"x": 10, "y": 12},
                            "placementCell": None,
                            "placementBuildId": None,
                            "placementDirection": None,
                        },
                    }
                )
                sync_for_ws1 = recv_until_type(ws1, "presence_sync")
                assert sync_for_ws1["presence"]["username"].startswith("bob")
                assert sync_for_ws1["presence"]["cursorCell"] == {"x": 10, "y": 12}

                ws2.send_json({"kind": "presence_clear"})
                clear_for_ws1 = recv_until_type(ws1, "presence_clear")
                assert clear_for_ws1["userId"] == sync_for_ws1["presence"]["userId"]


def test_game_ws_lockstep_command_broadcasts_on_target_tick():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "alice-game-lockstep@example.com")
        lobby = create_lobby(client, "game-ws-lockstep")
        lobby_id = lobby["_id"]

        with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws1:
            expect_initial_sync(ws1, lobby_id)

            create_and_login(client, "bob-game-lockstep@example.com")
            join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws2:
                _, _, bootstrap_two = expect_initial_sync(ws2, lobby_id)
                target_tick = int(bootstrap_two["currentTick"]) + 6
                ws1.send_json(
                    {
                        "kind": "lockstep_command",
                        "tick": target_tick,
                        "command": {
                            "type": "remove_cell",
                            "cell": {"x": 7, "y": 9},
                        },
                    }
                )

                received_command = None
                deadline = time.time() + 3
                while time.time() < deadline:
                    payload = recv_json(ws2)
                    if payload.get("type") != "lockstep_tick":
                        continue
                    if payload.get("tick") != target_tick:
                        continue
                    commands = payload.get("commands")
                    if not isinstance(commands, list):
                        continue
                    for command in commands:
                        if not isinstance(command, dict):
                            continue
                        inner = command.get("command")
                        if not isinstance(inner, dict):
                            continue
                        if inner.get("type") != "remove_cell":
                            continue
                        cell = inner.get("cell")
                        if cell == {"x": 7, "y": 9}:
                            received_command = command
                            break
                    if received_command is not None:
                        break
                assert received_command is not None
                assert str(received_command.get("userId"))
                assert str(received_command.get("username"))


def test_game_ws_requests_snapshot_from_existing_players_on_join():
    app = create_app()
    with TestClient(app) as client:
        create_and_login(client, "alice-game-snapshot-request@example.com")
        lobby = create_lobby(client, "game-ws-snapshot-request")
        lobby_id = lobby["_id"]

        with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws1:
            expect_initial_sync(ws1, lobby_id)

            create_and_login(client, "bob-game-snapshot-request@example.com")
            join_lobby(client, lobby_id)

            with client.websocket_connect(f"/api/v1/ws/game/{lobby_id}") as ws2:
                expect_initial_sync(ws2, lobby_id)
                request = recv_until_type(ws1, "snapshot_request")
                assert request["lobbyId"] == lobby_id
                assert isinstance(request["requestedByUserId"], str)
