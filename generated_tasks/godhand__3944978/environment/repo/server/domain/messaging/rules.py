from __future__ import annotations

from server.domain.messaging.errors import InvalidMessageError

MAX_MESSAGE_LENGTH = 2000

def validate_message_text(text: str) -> str:
    normalized = text.strip()
    if not normalized:
        raise InvalidMessageError("Message text cannot be empty.")
    if len(normalized) > MAX_MESSAGE_LENGTH:
        raise InvalidMessageError(
            f"Message text exceeds max length of {MAX_MESSAGE_LENGTH} characters."
        )
    return normalized

