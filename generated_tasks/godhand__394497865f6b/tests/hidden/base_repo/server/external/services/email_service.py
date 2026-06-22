from __future__ import annotations

import os
from typing import Any

from postmarker.core import PostmarkClient

from server.config import get_app_config
from server.utils.logging import get_email_logger

email_logger = get_email_logger()

from dotenv import load_dotenv

load_dotenv()


class EmailService:
    _client = None
    _sender_email = None
    _verify_template_id = None

    @classmethod
    def initialize(cls):
        """Initialize the email service."""
        server_token = os.environ.get("POSTMARK_SERVER_TOKEN")
        if not server_token:
            email_logger.warning("POSTMARK_SERVER_TOKEN not in .env, MockEmailClient will be used.")
            cls._client = MockEmailClient()
        elif get_app_config().TESTING:
            email_logger.info("Intialized MockEmailClient for testing.")
            cls._client = MockEmailClient()
        else:
            cls._client = PostmarkClient(server_token=server_token)
        cls._sender_email = os.environ.get("POSTMARK_FROM_EMAIL", "mock@godhand.local")
        cls._verify_template_id = int(os.environ.get("POSTMARK_VERIFY_TEMPLATE_ID", 0))

    @classmethod
    def send_verification_email(cls, user_email: str, username: str, verify_url: str):
        email_logger.info(f"Sending verification email to {user_email}")
        cls._client.emails.send_with_template(
            From=cls._sender_email,
            To=user_email,
            TemplateId=cls._verify_template_id,
            TemplateModel={
                "product_name": "Godhand",
                "name": username,
                "verify_url": verify_url,
            },
            MessageStream="outbound",
        )

class MockEmailClient:
    class _EmailsAPI:
        def __init__(self):
            self.sent_messages: list[dict[str, Any]] = []

        def send_with_template(self, **kwargs: Any) -> dict[str, Any]:
            self.sent_messages.append(kwargs)
            to_email = kwargs.get("To", "unknown")
            template_id = kwargs.get("TemplateId", "unknown")
            email_logger.info(
                "MockEmailClient captured template email: "
                f"to={to_email}, template_id={template_id}"
            )
            return {
                "ErrorCode": 0,
                "Message": "OK",
                "MessageID": f"mock-{len(self.sent_messages)}",
                "SubmittedAt": "mock",
                "To": to_email,
            }

    def __init__(self):
        self.emails = self._EmailsAPI()
