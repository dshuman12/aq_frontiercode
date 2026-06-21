"""Tests for nexusflow.utils.encoding utilities."""

import pytest

from nexusflow.utils.encoding import Base64Encoder, UnicodeHandler, URLEncoder


class TestBase64Encoder:
    """Tests for Base64 encoding/decoding."""

    def test_encode_string(self):
        encoded = Base64Encoder.encode("hello")
        assert isinstance(encoded, str)

    def test_decode_roundtrip(self):
        original = "Hello, World!"
        encoded = Base64Encoder.encode(original)
        decoded = Base64Encoder.decode(encoded)
        assert decoded == original.encode("utf-8")

    def test_encode_decode_string(self):
        original = "test string"
        encoded = Base64Encoder.encode_string(original)
        decoded = Base64Encoder.decode_string(encoded)
        assert decoded == original

    def test_url_safe_variant(self):
        data = b"\xff\xfe\xfd"
        encoded = Base64Encoder.encode(data, url_safe=True)
        decoded = Base64Encoder.decode(encoded, url_safe=True)
        assert decoded == data

    def test_is_valid(self):
        assert Base64Encoder.is_valid("aGVsbG8=") is True
        assert Base64Encoder.is_valid("not valid!!!") is False

    def test_handles_missing_padding(self):
        encoded = Base64Encoder.encode("test")
        stripped = encoded.rstrip("=")
        decoded = Base64Encoder.decode(stripped)
        assert decoded == b"test"


class TestURLEncoder:
    """Tests for URL encoding/decoding."""

    def test_encode_spaces(self):
        assert URLEncoder.encode("hello world") == "hello%20world"

    def test_decode_spaces(self):
        assert URLEncoder.decode("hello%20world") == "hello world"

    def test_encode_component_aggressive(self):
        result = URLEncoder.encode_component("a/b?c=d&e=f")
        assert "/" not in result or result.startswith("%")

    def test_encode_query_params(self):
        result = URLEncoder.encode_query_params({"a": "1", "b": "hello world"})
        assert "a=1" in result
        assert "hello" in result

    def test_decode_query_string(self):
        result = URLEncoder.decode_query_string("a=1&b=2&b=3")
        assert result["a"] == ["1"]
        assert result["b"] == ["2", "3"]

    def test_build_url(self):
        url = URLEncoder.build_url(
            scheme="https", host="example.com", port=8080,
            path="/api/v1", query={"key": "val"},
        )
        assert "https" in url
        assert "example.com:8080" in url
        assert "/api/v1" in url
        assert "key=val" in url

    def test_parse_url(self):
        result = URLEncoder.parse_url("https://user:pass@example.com:443/path?q=1#frag")
        assert result["scheme"] == "https"
        assert result["host"] == "example.com"
        assert result["port"] == 443
        assert result["path"] == "/path"
        assert result["fragment"] == "frag"
        assert result["username"] == "user"


class TestUnicodeHandler:
    """Tests for Unicode normalization utilities."""

    def test_strip_accents(self):
        assert UnicodeHandler.strip_accents("café") == "cafe"
        assert UnicodeHandler.strip_accents("naïve") == "naive"

    def test_is_ascii(self):
        assert UnicodeHandler.is_ascii("hello") is True
        assert UnicodeHandler.is_ascii("héllo") is False

    def test_to_ascii(self):
        result = UnicodeHandler.to_ascii("héllo", errors="ignore")
        assert "h" in result

    def test_safe_filename(self):
        result = UnicodeHandler.safe_filename("My File (v2.0) — final.txt")
        assert " " not in result or "_" in result
        assert len(result) <= 255

    def test_normalize_for_encode(self):
        text = "café"
        normalized = UnicodeHandler.normalize_for_encode(text)
        assert isinstance(normalized, str)

    def test_normalize_for_decode(self):
        text = "café"
        normalized = UnicodeHandler.normalize_for_decode(text)
        assert isinstance(normalized, str)
