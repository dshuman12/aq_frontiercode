from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict

@dataclass(frozen=True)
class ChatMessage:
    lobby_id: str
    user: str
    text: str
    ts: int

    def to_payload(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["type"] = "chat"
        payload["lobbyId"] = payload.pop("lobby_id")
        return payload


@dataclass(frozen=True)
class SystemMessage:
    lobby_id: str
    text: str
    ts: int
    count: int

    def to_payload(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["type"] = "system"
        payload["lobbyId"] = payload.pop("lobby_id")
        return payload

