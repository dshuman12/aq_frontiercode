"""Tests for nexusflow.config.loader.ConfigLoader."""

import os
import pytest
import tempfile

from nexusflow.config.loader import ConfigLoader


class TestConfigLoaderDefaults:
    """Tests for loading built-in default configuration."""

    def test_load_returns_defaults_when_no_sources(self):
        loader = ConfigLoader()
        config = loader.load()
        assert config["app"]["name"] == "nexusflow"
        assert config["app"]["port"] == 8000
        assert config["database"]["host"] == "localhost"
        assert config["database"]["pool_size"] == 5

    def test_default_auth_section_present(self):
        loader = ConfigLoader()
        config = loader.load()
        assert "auth" in config
        assert config["auth"]["algorithm"] == "HS256"
        assert config["auth"]["access_token_ttl"] == 3600

    def test_default_events_section(self):
        loader = ConfigLoader()
        config = loader.load()
        assert config["events"]["async_dispatch"] is True
        assert config["events"]["max_handlers_per_event"] == 50

    def test_default_tasks_section(self):
        loader = ConfigLoader()
        config = loader.load()
        assert config["tasks"]["max_workers"] == 4
        assert config["tasks"]["max_retries"] == 3

    def test_custom_defaults_override_builtins(self):
        custom = {"app": {"name": "custom-app", "port": 3000}}
        loader = ConfigLoader(defaults=custom)
        config = loader.load()
        assert config["app"]["name"] == "custom-app"
        assert config["app"]["port"] == 3000

    def test_defaults_are_deep_copied(self):
        defaults = {"app": {"name": "original", "nested": {"key": "value"}}}
        loader = ConfigLoader(defaults=defaults)
        config = loader.load()
        config["app"]["name"] = "modified"
        config["app"]["nested"]["key"] = "changed"
        assert defaults["app"]["name"] == "original"
        assert defaults["app"]["nested"]["key"] == "value"


class TestConfigLoaderYAML:
    """Tests for loading configuration from YAML files."""

    def test_load_yaml_file(self, tmp_path):
        yaml_content = "app:\n  name: yaml-app\n  port: 9090\n"
        config_file = tmp_path / "config.yaml"
        config_file.write_text(yaml_content)

        loader = ConfigLoader(config_path=str(config_file))
        config = loader.load()
        assert config["app"]["name"] == "yaml-app"
        assert config["app"]["port"] == 9090

    def test_yaml_merges_with_defaults(self, tmp_path):
        yaml_content = "app:\n  name: yaml-app\n"
        config_file = tmp_path / "config.yaml"
        config_file.write_text(yaml_content)

        loader = ConfigLoader(config_path=str(config_file))
        config = loader.load()
        assert config["app"]["name"] == "yaml-app"
        # Defaults should still be present for unset fields
        assert config["app"]["port"] == 8000

    def test_missing_yaml_file_returns_defaults(self):
        loader = ConfigLoader(config_path="/nonexistent/path/config.yaml")
        config = loader.load()
        assert config["app"]["name"] == "nexusflow"

    def test_empty_yaml_file_returns_defaults(self, tmp_path):
        config_file = tmp_path / "empty.yaml"
        config_file.write_text("")
        loader = ConfigLoader(config_path=str(config_file))
        config = loader.load()
        assert config["app"]["name"] == "nexusflow"

    def test_yaml_nested_sections(self, tmp_path):
        yaml_content = (
            "database:\n"
            "  host: db.example.com\n"
            "  port: 3306\n"
            "  pool_size: 20\n"
        )
        config_file = tmp_path / "config.yaml"
        config_file.write_text(yaml_content)

        loader = ConfigLoader(config_path=str(config_file))
        config = loader.load()
        assert config["database"]["host"] == "db.example.com"
        assert config["database"]["port"] == 3306
        assert config["database"]["pool_size"] == 20
        # Unset fields keep defaults
        assert config["database"]["pool_overflow"] == 10


class TestConfigLoaderEnvVars:
    """Tests for loading configuration from environment variables."""

    def test_env_var_overrides_default(self, monkeypatch):
        monkeypatch.setenv("NEXUS__APP__NAME", "env-app")
        loader = ConfigLoader()
        config = loader.load()
        assert config["app"]["name"] == "env-app"

    def test_env_var_bool_coercion(self, monkeypatch):
        monkeypatch.setenv("NEXUS__APP__DEBUG", "true")
        loader = ConfigLoader()
        config = loader.load()
        assert config["app"]["debug"] is True

    def test_env_var_int_coercion(self, monkeypatch):
        monkeypatch.setenv("NEXUS__APP__PORT", "3000")
        loader = ConfigLoader()
        config = loader.load()
        assert config["app"]["port"] == 3000

    def test_env_var_takes_precedence_over_yaml(self, tmp_path, monkeypatch):
        yaml_content = "app:\n  port: 5000\n"
        config_file = tmp_path / "config.yaml"
        config_file.write_text(yaml_content)
        monkeypatch.setenv("NEXUS__APP__PORT", "6000")

        loader = ConfigLoader(config_path=str(config_file))
        config = loader.load()
        assert config["app"]["port"] == 6000

    def test_custom_env_prefix(self, monkeypatch):
        monkeypatch.setenv("MYAPP__APP__NAME", "prefixed")
        loader = ConfigLoader(env_prefix="MYAPP")
        config = loader.load()
        assert config["app"]["name"] == "prefixed"


class TestConfigLoaderTypeCoercion:
    """Tests for value type coercion."""

    def test_coerce_true_variants(self):
        loader = ConfigLoader()
        assert loader._coerce_value("true") is True
        assert loader._coerce_value("yes") is True
        assert loader._coerce_value("1") is True
        assert loader._coerce_value("on") is True

    def test_coerce_false_variants(self):
        loader = ConfigLoader()
        assert loader._coerce_value("false") is False
        assert loader._coerce_value("no") is False
        assert loader._coerce_value("0") is False
        assert loader._coerce_value("off") is False

    def test_coerce_null_variants(self):
        loader = ConfigLoader()
        assert loader._coerce_value("null") is None
        assert loader._coerce_value("none") is None
        assert loader._coerce_value("") is None

    def test_coerce_integer(self):
        loader = ConfigLoader()
        assert loader._coerce_value("42") == 42
        assert isinstance(loader._coerce_value("42"), int)

    def test_coerce_float(self):
        loader = ConfigLoader()
        assert loader._coerce_value("3.14") == 3.14
        assert isinstance(loader._coerce_value("3.14"), float)

    def test_coerce_string_passthrough(self):
        loader = ConfigLoader()
        assert loader._coerce_value("hello world") == "hello world"
