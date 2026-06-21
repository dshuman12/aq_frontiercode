"""Tests for nexusflow.config.schema configuration validation."""

import pytest

from nexusflow.config.schema import (
    AppConfig,
    AuthConfig,
    CacheConfig,
    ConfigSchema,
    ConfigValidationError,
    DatabaseConfig,
    EventsConfig,
    RateLimitConfig,
    TasksConfig,
    TelemetryConfig,
)


class TestAppConfig:
    def test_valid_defaults(self):
        cfg = AppConfig()
        assert cfg.validate() == []

    def test_invalid_name_rejects_leading_digit(self):
        cfg = AppConfig(name="123bad")
        errors = cfg.validate()
        assert any("app.name" in e for e in errors)

    def test_invalid_port_zero(self):
        cfg = AppConfig(port=0)
        errors = cfg.validate()
        assert any("app.port" in e for e in errors)

    def test_invalid_workers_too_high(self):
        cfg = AppConfig(workers=100)
        errors = cfg.validate()
        assert any("app.workers" in e for e in errors)


class TestDatabaseConfig:
    def test_valid_defaults(self):
        cfg = DatabaseConfig()
        assert cfg.validate() == []

    def test_connection_string(self):
        cfg = DatabaseConfig(user="admin", password="secret", host="db.local", port=5432, name="mydb")
        assert cfg.connection_string == "postgresql://admin:secret@db.local:5432/mydb"

    def test_invalid_pool_size_zero(self):
        cfg = DatabaseConfig(pool_size=0)
        errors = cfg.validate()
        assert any("pool_size" in e for e in errors)


class TestAuthConfig:
    def test_valid_defaults(self):
        cfg = AuthConfig()
        assert cfg.validate() == []

    def test_unsupported_algorithm(self):
        cfg = AuthConfig(algorithm="NONE")
        errors = cfg.validate()
        assert any("algorithm" in e for e in errors)

    def test_access_ttl_too_short(self):
        cfg = AuthConfig(access_token_ttl=10)
        errors = cfg.validate()
        assert any("access_token_ttl" in e for e in errors)

    def test_refresh_must_exceed_access(self):
        cfg = AuthConfig(access_token_ttl=3600, refresh_token_ttl=3600)
        errors = cfg.validate()
        assert any("refresh_token_ttl" in e for e in errors)


class TestConfigSchema:
    def test_default_schema_validates(self):
        schema = ConfigSchema()
        errors = schema.validate()
        assert errors == []

    def test_validate_or_raise_on_invalid(self):
        schema = ConfigSchema()
        schema.app = AppConfig(port=0)
        with pytest.raises(ConfigValidationError):
            schema.validate_or_raise()

    def test_from_dict_populates_app(self, app_config):
        schema = ConfigSchema.from_dict(app_config)
        assert schema.app.name == "test-app"
        assert schema.app.debug is True
        assert schema.app.port == 9000

    def test_from_dict_ignores_unknown_fields(self):
        data = {"app": {"name": "ok", "unknown_field": 123}}
        schema = ConfigSchema.from_dict(data)
        assert schema.app.name == "ok"
        assert not hasattr(schema.app, "unknown_field")

    def test_from_dict_nested_auth_rate_limit(self, app_config):
        app_config["auth"]["rate_limit"] = {
            "enabled": False,
            "requests_per_minute": 30,
            "burst_size": 5,
        }
        schema = ConfigSchema.from_dict(app_config)
        assert schema.auth.rate_limit.enabled is False
        assert schema.auth.rate_limit.requests_per_minute == 30

    def test_rate_limit_burst_cannot_exceed_rpm(self):
        rl = RateLimitConfig(requests_per_minute=10, burst_size=20)
        errors = rl.validate()
        assert any("burst_size" in e for e in errors)

    def test_telemetry_invalid_log_level(self):
        cfg = TelemetryConfig(log_level="TRACE")
        errors = cfg.validate()
        assert any("log_level" in e for e in errors)

    def test_cache_unsupported_backend(self):
        cfg = CacheConfig(backend="memcached")
        errors = cfg.validate()
        assert any("backend" in e for e in errors)
