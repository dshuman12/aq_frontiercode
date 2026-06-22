from __future__ import annotations

import json
from typing import Any, Mapping

from pydantic import TypeAdapter, ValidationError

from .models import ClientEnvelope

_CLIENT_ENVELOPE_ADAPTER = TypeAdapter(ClientEnvelope)


class ProtocolError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def decode_client_envelope(raw: str, *, max_bytes: int) -> ClientEnvelope:
    raw_bytes = raw.encode("utf-8", errors="replace")
    if len(raw_bytes) > max_bytes:
        raise ProtocolError("payload_too_large", "payload exceeds max message size")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ProtocolError("invalid_json", f"invalid json: {exc.msg}") from exc

    try:
        return _CLIENT_ENVELOPE_ADAPTER.validate_python(payload)
    except ValidationError as exc:
        raise ProtocolError("invalid_payload", exc.errors()[0]["msg"]) from exc


def encode_server_payload(payload: Mapping[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
