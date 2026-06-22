from __future__ import annotations

import pytest

from server.domain.messaging.errors import InvalidMessageError
from server.domain.messaging.rules import MAX_MESSAGE_LENGTH, validate_message_text


def test_validate_message_text_trims_and_accepts_valid_text():
    assert validate_message_text("  hello  ") == "hello"


def test_validate_message_text_rejects_empty_text():
    with pytest.raises(InvalidMessageError):
        validate_message_text("   ")


def test_validate_message_text_rejects_over_limit_text():
    with pytest.raises(InvalidMessageError):
        validate_message_text("x" * (MAX_MESSAGE_LENGTH + 1))

