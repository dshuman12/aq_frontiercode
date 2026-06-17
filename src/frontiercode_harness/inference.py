from __future__ import annotations

import os
import urllib.error
from typing import Any


DEFAULT_BASE_URL = "https://api.aqinference.com/v1"
DEFAULT_MODEL = "gpt-4.1-mini"
LEGACY_BASE_URL = "https://inference.afterquery.com/v1"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


def normalize_base_url(base_url: str | None) -> str:
    resolved = (base_url or DEFAULT_BASE_URL).strip().rstrip("/")
    if resolved == LEGACY_BASE_URL:
        return DEFAULT_BASE_URL
    return resolved


def inference_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": os.environ.get("FRONTIERCODE_USER_AGENT", DEFAULT_USER_AGENT),
    }


def inference_metadata(default_feature: str) -> dict[str, str]:
    metadata = {
        "project": os.environ.get("FRONTIERCODE_PROJECT", "frontier-code"),
        "feature": os.environ.get("FRONTIERCODE_FEATURE", default_feature),
    }
    user_id = _first_env("FRONTIERCODE_USER_ID")
    user_email = _first_env("FRONTIERCODE_USER_EMAIL")
    if user_id:
        metadata["userId"] = user_id
    if user_email:
        metadata["userEmail"] = user_email
    return metadata


def build_inference_payload(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    feature: str,
    reasoning_effort: str | None = None,
) -> dict[str, Any]:
    payload = {
        "model": model,
        "instructions": system_prompt,
        "input": user_prompt,
        "metadata": inference_metadata(feature),
    }
    if reasoning_effort:
        payload["reasoning"] = {"effort": reasoning_effort}
    return payload


def extract_inference_content(response_data: dict[str, Any]) -> str:
    content = response_data.get("content")
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        content_text = "\n".join(_content_texts(content)).strip()
        if content_text:
            return content_text
    raise ValueError(
        "Inference result did not contain content; "
        f"{summarize_inference_without_content(response_data)}"
    )


def summarize_inference_without_content(response_data: dict[str, Any]) -> str:
    pieces = []
    for key in (
        "finishReason",
        "nativeFinishReason",
        "provider",
        "model",
        "route",
        "id",
    ):
        if key in response_data:
            pieces.append(f"{key}={_short_repr(response_data[key])}")
    pieces.append(f"keys={sorted(response_data.keys())}")
    if "content" in response_data:
        pieces.append(f"content={_short_repr(response_data.get('content'))}")
    else:
        pieces.append("content=absent")
    return "; ".join(pieces)


def format_http_error(exc: urllib.error.HTTPError, *, max_body_chars: int = 1200) -> str:
    try:
        body = exc.read().decode("utf-8", errors="replace").strip()
    except Exception:  # noqa: BLE001 - best effort diagnostics for failed requests.
        body = ""
    finally:
        exc.close()
    if body:
        compact_body = " ".join(body.split())
        if len(compact_body) > max_body_chars:
            compact_body = compact_body[:max_body_chars].rstrip() + "..."
        return f"HTTP Error {exc.code}: {exc.reason}; response body: {compact_body}"
    return f"HTTP Error {exc.code}: {exc.reason}"


def _first_env(*names: str) -> str | None:
    for name in names:
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return None


def _content_texts(content_items: list[Any]) -> list[str]:
    texts: list[str] = []
    for content_item in content_items:
        if isinstance(content_item, str):
            texts.append(content_item)
        elif isinstance(content_item, dict):
            text = content_item.get("text")
            if isinstance(text, str):
                texts.append(text)
    return texts


def _short_repr(value: Any, *, max_chars: int = 500) -> str:
    try:
        rendered = json_dumps_compact(value)
    except TypeError:
        rendered = str(value)
    if len(rendered) > max_chars:
        return rendered[:max_chars].rstrip() + "..."
    return rendered


def json_dumps_compact(value: Any) -> str:
    import json

    return json.dumps(value, sort_keys=True, separators=(",", ":"))
