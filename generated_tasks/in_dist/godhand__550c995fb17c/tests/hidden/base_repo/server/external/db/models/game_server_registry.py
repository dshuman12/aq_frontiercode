from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from bson import ObjectId
from pydantic import ConfigDict, Field
from pymongo import ASCENDING, ReturnDocument

from server.external.db.mongo import MongoDBClient
from server.external.db.models.base import Timestamped


class GameServerRegistry(Timestamped):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[str] = Field(default=None, alias="_id")
    server_id: str
    owner_type: str = "official"
    region: str
    game_ws_base_url: str
    chat_ws_base_url: str | None = None
    official_keys: list[str] = Field(default_factory=list)
    status: str = "online"
    current_players: int = 0
    max_players: int = 0
    last_heartbeat_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    heartbeat_expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def collection(cls):
        return MongoDBClient.get_db()["game_server_registry"]

    @classmethod
    def ensure_indexes(cls) -> None:
        cls.collection().create_index([("server_id", ASCENDING)], unique=True, name="uniq_server_id")
        cls.collection().create_index([("status", ASCENDING)], name="idx_status")
        cls.collection().create_index([("heartbeat_expires_at", ASCENDING)], name="idx_heartbeat_expires_at")
        cls.collection().create_index([("official_keys", ASCENDING)], name="idx_official_keys")
        cls.collection().create_index([("region", ASCENDING)], name="idx_region")

    @classmethod
    def from_mongo(cls, data: dict[str, Any] | None) -> Optional["GameServerRegistry"]:
        if not data:
            return None
        doc = dict(data)
        if doc.get("_id") is not None:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)

    @classmethod
    def upsert_registration(
        cls,
        *,
        server_id: str,
        owner_type: str,
        region: str,
        game_ws_base_url: str,
        chat_ws_base_url: str | None,
        official_keys: list[str],
        current_players: int,
        max_players: int,
        ttl_seconds: int,
    ) -> Optional["GameServerRegistry"]:
        cls.ensure_indexes()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=max(1, ttl_seconds))
        doc = cls.collection().find_one_and_update(
            {"server_id": server_id},
            {
                "$set": {
                    "owner_type": owner_type,
                    "region": region,
                    "game_ws_base_url": game_ws_base_url,
                    "chat_ws_base_url": chat_ws_base_url,
                    "official_keys": official_keys,
                    "status": "online",
                    "current_players": max(0, current_players),
                    "max_players": max(0, max_players),
                    "last_heartbeat_at": now,
                    "heartbeat_expires_at": expires_at,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def heartbeat(
        cls,
        *,
        server_id: str,
        current_players: int | None,
        max_players: int | None,
        ttl_seconds: int,
    ) -> Optional["GameServerRegistry"]:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=max(1, ttl_seconds))
        update_fields: dict[str, Any] = {
            "status": "online",
            "last_heartbeat_at": now,
            "heartbeat_expires_at": expires_at,
            "updated_at": now,
        }
        if current_players is not None:
            update_fields["current_players"] = max(0, current_players)
        if max_players is not None:
            update_fields["max_players"] = max(0, max_players)

        doc = cls.collection().find_one_and_update(
            {"server_id": server_id},
            {"$set": update_fields},
            return_document=ReturnDocument.AFTER,
        )
        return cls.from_mongo(doc)

    @classmethod
    def list_healthy(cls) -> list["GameServerRegistry"]:
        cls.ensure_indexes()
        now = datetime.now(timezone.utc)
        docs = cls.collection().find(
            {
                "status": "online",
                "heartbeat_expires_at": {"$gt": now},
            }
        )
        result: list["GameServerRegistry"] = []
        for doc in docs:
            parsed = cls.from_mongo(doc)
            if parsed:
                result.append(parsed)
        return result

    @classmethod
    def get_by_server_id(cls, server_id: str) -> Optional["GameServerRegistry"]:
        if not server_id:
            return None
        doc = cls.collection().find_one({"server_id": server_id})
        return cls.from_mongo(doc)

