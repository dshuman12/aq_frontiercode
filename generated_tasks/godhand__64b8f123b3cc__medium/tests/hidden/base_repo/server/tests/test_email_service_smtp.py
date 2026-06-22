from __future__ import annotations

import pytest

from server.config import reset_settings_cache
from server.external.services.email_service import EmailService, MockEmailClient


@pytest.fixture(autouse=True)
def _reset_email_service_state(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("FASTAPI_ENV", "development")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-32-bytes-minimum")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key-32-bytes-min")
    monkeypatch.delenv("POSTMARK_SERVER_TOKEN", raising=False)
    monkeypatch.delenv("POSTMARK_FROM_EMAIL", raising=False)
    monkeypatch.delenv("POSTMARK_VERIFY_TEMPLATE_ID", raising=False)
    reset_settings_cache()
    EmailService._client = None
    EmailService._sender_email = None
    EmailService._verify_template_id = None
    yield
    reset_settings_cache()
    EmailService._client = None
    EmailService._sender_email = None
    EmailService._verify_template_id = None


def test_initialize_without_postmark_token_uses_mock() -> None:
    EmailService.initialize()
    assert isinstance(EmailService._client, MockEmailClient)


def test_initialize_testing_environment_uses_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FASTAPI_ENV", "testing")
    monkeypatch.setenv("POSTMARK_SERVER_TOKEN", "test-token")

    reset_settings_cache()
    EmailService.initialize()

    assert isinstance(EmailService._client, MockEmailClient)


def test_send_verification_email_uses_template_model_with_mock() -> None:
    EmailService.initialize()
    assert isinstance(EmailService._client, MockEmailClient)

    EmailService.send_verification_email(
        user_email="player@example.com",
        username="player",
        verify_url="https://example.com/verify?token=abc123",
    )

    sent = EmailService._client.emails.sent_messages
    assert len(sent) == 1
    payload = sent[0]
    assert payload["To"] == "player@example.com"
    assert payload["TemplateModel"]["name"] == "player"
    assert payload["TemplateModel"]["verify_url"] == "https://example.com/verify?token=abc123"
