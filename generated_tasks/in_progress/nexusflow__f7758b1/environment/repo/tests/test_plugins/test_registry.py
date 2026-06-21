"""Tests for nexusflow.plugins.registry."""

import pytest

from nexusflow.plugins.registry import (
    PluginEntry,
    PluginMeta,
    PluginRegistry,
    PluginState,
)


class SamplePlugin:
    name = "sample"
    version = "1.0.0"
    description = "A sample plugin"
    priority = 50
    dependencies = []
    tags = ["test"]

    def initialize(self):
        self.initialized = True


class DependentPlugin:
    name = "dependent"
    version = "1.0.0"
    dependencies = ["sample"]
    priority = 100


class MissingDepPlugin:
    name = "broken"
    version = "0.1.0"
    dependencies = ["nonexistent"]
    priority = 100


class TestPluginRegistration:
    """Tests for registering plugins."""

    def test_register_plugin(self):
        registry = PluginRegistry()
        name = registry.register(SamplePlugin)
        assert name == "sample"

    def test_register_with_explicit_meta(self):
        registry = PluginRegistry()
        meta = PluginMeta(name="custom", version="2.0.0")
        name = registry.register(SamplePlugin, meta=meta)
        assert name == "custom"

    def test_register_with_config(self):
        registry = PluginRegistry()
        registry.register(SamplePlugin, config={"key": "value"})
        entry = registry._plugins["sample"]
        assert entry.config["key"] == "value"

    def test_extract_meta_from_class(self):
        registry = PluginRegistry()
        meta = registry._extract_meta(SamplePlugin)
        assert meta.name == "sample"
        assert meta.version == "1.0.0"
        assert meta.priority == 50


class TestPluginLoading:
    """Tests for plugin load order and dependency resolution."""

    def test_load_all(self):
        registry = PluginRegistry()
        registry.register(SamplePlugin)
        loaded = registry.load_all()
        assert "sample" in loaded
        assert registry._plugins["sample"].state == PluginState.LOADED

    def test_dependency_resolved_before_dependent(self):
        registry = PluginRegistry()
        registry.register(DependentPlugin)
        registry.register(SamplePlugin)
        loaded = registry.load_all()
        assert loaded.index("sample") < loaded.index("dependent")

    def test_missing_dependency_fails(self):
        registry = PluginRegistry()
        registry.register(MissingDepPlugin)
        loaded = registry.load_all()
        assert "broken" not in loaded
        assert registry._plugins["broken"].state == PluginState.FAILED

    def test_already_loaded_skipped(self):
        registry = PluginRegistry()
        registry.register(SamplePlugin)
        registry.load_all()
        loaded_again = registry.load_all()
        assert "sample" not in loaded_again


class TestPluginEntry:
    """Tests for PluginEntry."""

    def test_entry_to_dict(self):
        meta = PluginMeta(name="test", version="1.0")
        entry = PluginEntry(meta=meta, state=PluginState.ACTIVE)
        d = entry.to_dict()
        assert d["name"] == "test"
        assert d["state"] == "active"

    def test_plugin_state_transitions(self):
        registry = PluginRegistry()
        registry.register(SamplePlugin)
        assert registry._plugins["sample"].state == PluginState.DISCOVERED
        registry.load_all()
        assert registry._plugins["sample"].state == PluginState.LOADED
