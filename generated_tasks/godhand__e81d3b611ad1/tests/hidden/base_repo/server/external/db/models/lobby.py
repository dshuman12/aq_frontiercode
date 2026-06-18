from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pydantic import ConfigDict, Field
from pymongo import ASCENDING, ReturnDocument

from server.external.db.mongo import MongoDBClient
from server.external.db.models.base import Timestamped


class Lobby(Timestamped):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[str] = Field(default=None, alias="_id")

    lobby_name: str
    owner_user_id: str
    lobby_kind: str = "custom"
    official_key: str | None = None
    server_region: str | None = None
    server_description: str | None = None
    user_capacity: int = 4
    players: list[str] = Field(default_factory=list)
    population: list[str] = Field(default_factory=list)
    world_snapshot: Any | None = None
    assigned_game_server_id: str | None = None
    assigned_game_region: str | None = None
    assigned_game_ws_base_url: str | None = None
    assigned_chat_ws_base_url: str | None = None

    @classmethod
    def collection(cls):
        return MongoDBClient.get_db()["lobby"]

    @classmethod
    def ensure_indexes(cls) -> None:
        cls.collection().create_index([("lobby_name", ASCENDING)], name="idx_lobby_name")
        cls.collection().create_index([("owner_user_id", ASCENDING)], name="idx_owner_user_id")
        cls.collection().create_index([("players", ASCENDING)], name="idx_players")
        cls.collection().create_index([("lobby_kind", ASCENDING)], name="idx_lobby_kind")
        cls.collection().create_index(
            [("official_key", ASCENDING)],
            unique=True,
            sparse=True,
            name="uniq_official_key",
        )

    @classmethod
    def from_mongo(cls, data: dict[str, Any] | None) -> Optional["Lobby"]:
        if not data:
            return None
        doc = dict(data)
        if doc.get("_id") is not None:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)

    @classmethod
    def create(cls, **kwargs) -> "Lobby":
        cls.ensure_indexes()
        lobby = cls(**kwargs)
        doc = lobby.model_dump(by_alias=True, exclude_none=True)
        doc.pop("_id", None)
        if "population" not in doc:
            doc["population"] = list(doc.get("players") or [])

        now = datetime.now(timezone.utc)
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)

        res = cls.collection().insert_one(doc)
        doc["_id"] = res.inserted_id
        return cls.from_mongo(doc)

    @classmethod
    def upsert_official(
        cls,
        *,
        official_key: str,
        lobby_name: str,
        user_capacity: int,
        server_region: str,
        server_description: str,
    ) -> Optional["Lobby"]:
        if not official_key:
            return None

        cls.ensure_indexes()
        now = datetime.now(timezone.utc)
        doc = cls.collection().find_one_and_update(
            {"official_key": official_key},
            {
                "$set": {
                    "lobby_name": lobby_name,
                    "lobby_kind": "official",
                    "server_region": server_region,
                    "server_description": server_description,
                    "user_capacity": user_capacity,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "owner_user_id": "official-server",
                    "players": [],
                    "population": [],
                    "world_snapshot": None,
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def get_by_id(cls, lobby_id: str) -> Optional["Lobby"]:
        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None
        doc = cls.collection().find_one({"_id": oid})
        return cls.from_mongo(doc)

    @classmethod
    def join(cls, lobby_id: str, user_id: str) -> Optional["Lobby"]:
        """
        Add user_id to players if lobby exists or is full
        """
        if not user_id:
            return None

        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        now = datetime.now(timezone.utc)

        doc = cls.collection().find_one_and_update(
            {
                "_id": oid,
                # capacity check: size(players) < user_capacity
                "$expr": {"$lt": [{"$size": "$players"}, "$user_capacity"]},
            },
            {
                "$addToSet": {
                    "players": user_id,
                    "population": user_id,
                },
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )

        return cls.from_mongo(doc)

    @classmethod
    def move_user_to_lobby(cls, lobby_id: str, user_id: str) -> Optional["Lobby"]:
        if not user_id:
            return None

        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        target = cls.collection().find_one({"_id": oid}, {"players": 1, "user_capacity": 1})
        if not target:
            return None

        players = target.get("players") or []
        capacity = int(target.get("user_capacity") or 0)
        if user_id not in players and len(players) >= capacity:
            return None

        now = datetime.now(timezone.utc)
        cls.collection().update_many(
            {"_id": {"$ne": oid}, "players": user_id},
            {
                "$pull": {"players": user_id},
                "$set": {"updated_at": now},
            },
        )

        doc = cls.collection().find_one_and_update(
            {"_id": oid},
            {
                "$addToSet": {
                    "players": user_id,
                    "population": user_id,
                },
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def leave(cls, lobby_id: str, user_id: str) -> Optional["Lobby"]:
        """
        Removes user_id from players and returns updated Lobby or None if lobby not found.
        """
        if not user_id:
            return None

        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        now = datetime.now(timezone.utc)

        doc = cls.collection().find_one_and_update(
            {"_id": oid},
            {
                "$pull": {"players": user_id},
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def update_world_snapshot(cls, lobby_id: str, world_snapshot: Any) -> Optional["Lobby"]:
        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        now = datetime.now(timezone.utc)
        doc = cls.collection().find_one_and_update(
            {"_id": oid},
            {
                "$set": {
                    "world_snapshot": world_snapshot,
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def update_routing_assignment(
        cls,
        lobby_id: str,
        *,
        game_server_id: str,
        game_region: str,
        game_ws_base_url: str,
        chat_ws_base_url: str,
    ) -> Optional["Lobby"]:
        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        now = datetime.now(timezone.utc)
        doc = cls.collection().find_one_and_update(
            {"_id": oid},
            {
                "$set": {
                    "assigned_game_server_id": game_server_id,
                    "assigned_game_region": game_region,
                    "assigned_game_ws_base_url": game_ws_base_url,
                    "assigned_chat_ws_base_url": chat_ws_base_url,
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def get_all(cls) -> list["Lobby"]:
        docs = cls.collection().find().sort("created_at", -1)
        lobbies: list["Lobby"] = []
        for doc in docs:
            parsed = cls.from_mongo(doc)
            if parsed is None:
                continue
            lobbies.append(parsed)
        return lobbies

    @classmethod
    def reset_runtime_state(
        cls,
        lobby_id: str,
        *,
        clear_players: bool = True,
        clear_population: bool = False,
        clear_world_snapshot: bool = True,
    ) -> Optional["Lobby"]:
        try:
            oid = ObjectId(lobby_id)
        except Exception:
            return None

        set_fields: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if clear_world_snapshot:
            set_fields["world_snapshot"] = None
        if clear_players:
            set_fields["players"] = []
        if clear_population:
            set_fields["population"] = []

        doc = cls.collection().find_one_and_update(
            {"_id": oid},
            {"$set": set_fields},
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def reset_by_assigned_game_server(
        cls,
        game_server_id: str,
        *,
        clear_players: bool = True,
        clear_population: bool = False,
        clear_world_snapshot: bool = True,
    ) -> int:
        resolved_server_id = (game_server_id or "").strip()
        if not resolved_server_id:
            return 0

        set_fields: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if clear_world_snapshot:
            set_fields["world_snapshot"] = None
        if clear_players:
            set_fields["players"] = []
        if clear_population:
            set_fields["population"] = []

        result = cls.collection().update_many(
            {"assigned_game_server_id": resolved_server_id},
            {"$set": set_fields},
        )
        return int(result.modified_count or 0)
