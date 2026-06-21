"""
nexusflow.utils.encoding
~~~~~~~~~~~~~~~~~~~~~~~~~

Base64, URL encoding, and Unicode handling utilities. Provides
consistent encoding/decoding across the framework.

BUG CANDIDATE #18: Unicode normalization differs between the encode
and decode paths. The encode function uses NFC normalization, but the
decode function uses NFD, causing round-trip inconsistencies for
certain Unicode strings (e.g., accented characters).
"""

from __future__ import annotations

import base64
import binascii
import re
import unicodedata
import urllib.parse
from typing import Any, Dict, List, Optional, Union


class Base64Encoder:
    """Base64 encoding/decoding with URL-safe variant support."""

    @staticmethod
    def encode(data: Union[str, bytes], url_safe: bool = False) -> str:
        """Encode data to base64."""
        if isinstance(data, str):
            data = data.encode("utf-8")
        if url_safe:
            return base64.urlsafe_b64encode(data).decode("ascii")
        return base64.b64encode(data).decode("ascii")

    @staticmethod
    def decode(encoded: str, url_safe: bool = False) -> bytes:
        """Decode base64 data."""
        # Add padding if missing
        padding = 4 - len(encoded) % 4
        if padding != 4:
            encoded += "=" * padding
        if url_safe:
            return base64.urlsafe_b64decode(encoded)
        return base64.b64decode(encoded)

    @staticmethod
    def encode_string(data: str, url_safe: bool = False) -> str:
        """Encode a string to base64 and return string."""
        return Base64Encoder.encode(data, url_safe)

    @staticmethod
    def decode_string(encoded: str, url_safe: bool = False) -> str:
        """Decode base64 to a string."""
        return Base64Encoder.decode(encoded, url_safe).decode("utf-8")

    @staticmethod
    def is_valid(data: str) -> bool:
        """Check if a string is valid base64."""
        try:
            base64.b64decode(data, validate=True)
            return True
        except (binascii.Error, ValueError):
            return False


class URLEncoder:
    """URL encoding and decoding utilities."""

    @staticmethod
    def encode(value: str, safe: str = "") -> str:
        """URL-encode a string."""
        return urllib.parse.quote(value, safe=safe)

    @staticmethod
    def decode(value: str) -> str:
        """URL-decode a string."""
        return urllib.parse.unquote(value)

    @staticmethod
    def encode_component(value: str) -> str:
        """Encode a URL component (more aggressive than encode)."""
        return urllib.parse.quote(value, safe="")

    @staticmethod
    def decode_component(value: str) -> str:
        """Decode a URL component."""
        return urllib.parse.unquote(value)

    @staticmethod
    def encode_query_params(params: Dict[str, Any]) -> str:
        """Encode a dict as a query string."""
        return urllib.parse.urlencode(params, doseq=True)

    @staticmethod
    def decode_query_string(query: str) -> Dict[str, List[str]]:
        """Decode a query string to a dict."""
        return urllib.parse.parse_qs(query, keep_blank_values=True)

    @staticmethod
    def build_url(
        scheme: str = "https",
        host: str = "localhost",
        port: Optional[int] = None,
        path: str = "/",
        query: Optional[Dict[str, Any]] = None,
        fragment: str = "",
    ) -> str:
        """Build a URL from components."""
        netloc = host
        if port:
            netloc = f"{host}:{port}"
        query_str = urllib.parse.urlencode(query or {})
        return urllib.parse.urlunparse((
            scheme, netloc, path, "", query_str, fragment,
        ))

    @staticmethod
    def parse_url(url: str) -> Dict[str, Any]:
        """Parse a URL into components."""
        parsed = urllib.parse.urlparse(url)
        return {
            "scheme": parsed.scheme,
            "host": parsed.hostname or "",
            "port": parsed.port,
            "path": parsed.path,
            "query": urllib.parse.parse_qs(parsed.query),
            "fragment": parsed.fragment,
            "username": parsed.username,
            "password": parsed.password,
        }


class UnicodeHandler:
    """
    Unicode normalization and handling.

    BUG CANDIDATE #18: The normalize_for_encode method uses NFC
    normalization (composed form), but normalize_for_decode uses
    NFD (decomposed form). This means a string that is encoded
    and then decoded may not be equal to the original because the
    normalization form has changed.
    """

    @staticmethod
    def normalize_for_encode(text: str) -> str:
        """
        Normalize text for encoding.

        Uses NFC (Canonical Decomposition, followed by Canonical Composition).
        """
        return unicodedata.normalize("NFC", text)

    @staticmethod
    def normalize_for_decode(text: str) -> str:
        """
        Normalize text after decoding.

        BUG CANDIDATE #18: Uses NFD instead of NFC, creating
        a round-trip inconsistency. The same character may be
        represented differently after encode -> decode.
        """
        # BUG: Should use "NFC" to match normalize_for_encode,
        # but uses "NFD" instead
        return unicodedata.normalize("NFD", text)

    @staticmethod
    def strip_accents(text: str) -> str:
        """Remove accent marks from text."""
        nfkd = unicodedata.normalize("NFKD", text)
        return "".join(c for c in nfkd if not unicodedata.combining(c))

    @staticmethod
    def to_ascii(text: str, errors: str = "replace") -> str:
        """Convert Unicode text to ASCII."""
        return text.encode("ascii", errors=errors).decode("ascii")

    @staticmethod
    def is_ascii(text: str) -> bool:
        """Check if text is pure ASCII."""
        try:
            text.encode("ascii")
            return True
        except UnicodeEncodeError:
            return False

    @staticmethod
    def safe_filename(text: str) -> str:
        """Convert text to a safe filename."""
        # Normalize
        normalized = unicodedata.normalize("NFKD", text)
        # Remove non-ASCII
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        # Replace unsafe chars
        safe = re.sub(r"[^\w\s\-.]", "", ascii_text)
        safe = re.sub(r"[\s]+", "_", safe)
        return safe.strip("._")[:255]

    @staticmethod
    def truncate_unicode(text: str, max_bytes: int, encoding: str = "utf-8") -> str:
        """Truncate a Unicode string to fit within max_bytes."""
        encoded = text.encode(encoding)
        if len(encoded) <= max_bytes:
            return text
        # Truncate and decode, handling partial characters
        truncated = encoded[:max_bytes]
        return truncated.decode(encoding, errors="ignore")


class HexEncoder:
    """Hexadecimal encoding utilities."""

    @staticmethod
    def encode(data: Union[str, bytes]) -> str:
        if isinstance(data, str):
            data = data.encode("utf-8")
        return data.hex()

    @staticmethod
    def decode(hex_string: str) -> bytes:
        return bytes.fromhex(hex_string)

    @staticmethod
    def decode_string(hex_string: str) -> str:
        return bytes.fromhex(hex_string).decode("utf-8")

    @staticmethod
    def is_valid(hex_string: str) -> bool:
        try:
            bytes.fromhex(hex_string)
            return True
        except ValueError:
            return False
