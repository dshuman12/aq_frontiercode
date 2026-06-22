#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from server.external.services.email_service import EmailService, MockEmailClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send a verification email through the configured backend email service."
    )
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--username", default="test-user", help="Recipient username")
    parser.add_argument(
        "--verify-url",
        default="http://localhost:5050/api/v1/auth/verify-email?token=test-token",
        help="Verification URL to embed in the email",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    EmailService.initialize()

    client_name = type(EmailService._client).__name__
    print(f"email_client={client_name}")
    print(f"postmark_server_token_set={bool(os.getenv('POSTMARK_SERVER_TOKEN'))}")
    print(f"postmark_from_email={os.getenv('POSTMARK_FROM_EMAIL')}")
    print(f"postmark_verify_template_id={os.getenv('POSTMARK_VERIFY_TEMPLATE_ID')}")

    if isinstance(EmailService._client, MockEmailClient):
        print("warning=MockEmailClient is active; no real email will be delivered.")

    try:
        EmailService.send_verification_email(
            user_email=args.to,
            username=args.username,
            verify_url=args.verify_url,
        )
    except Exception as exc:
        print(f"send_status=failed error={exc}")
        return 1

    print("send_status=ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
