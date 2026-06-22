"""Tests for nexusflow.plugins.hooks hook system."""

import pytest

from nexusflow.plugins.hooks import HookPoint, HookRegistration, HookSystem


class TestHookPoint:
    """Tests for individual hook points."""

    def test_register_handler(self):
        hook = HookPoint("on_startup")
        hook.register(lambda: "ok", plugin_name="my_plugin")
        assert hook.handler_count() == 1

    def test_unregister_handler(self):
        hook = HookPoint("on_startup")
        hook.register(lambda: "ok", plugin_name="plugin_a")
        hook.register(lambda: "ok", plugin_name="plugin_b")
        removed = hook.unregister("plugin_a")
        assert removed == 1
        assert hook.handler_count() == 1

    def test_execute_collects_results(self):
        hook = HookPoint("transform")
        hook.register(lambda: 1, plugin_name="a")
        hook.register(lambda: 2, plugin_name="b")
        results = hook.execute()
        assert results == [1, 2]

    def test_execute_priority_order(self):
        hook = HookPoint("ordered")
        hook.register(lambda: "low", plugin_name="a", priority=200)
        hook.register(lambda: "high", plugin_name="b", priority=10)
        results = hook.execute()
        assert results == ["high", "low"]

    def test_execute_pipeline(self):
        hook = HookPoint("pipeline")
        hook.register(lambda val: val + 1, plugin_name="a", priority=1)
        hook.register(lambda val: val * 2, plugin_name="b", priority=2)
        result = hook.execute_pipeline(5)
        assert result == 12  # (5 + 1) * 2

    def test_execute_first(self):
        hook = HookPoint("first")
        hook.register(lambda: None, plugin_name="a", priority=1)
        hook.register(lambda: "found", plugin_name="b", priority=2)
        result = hook.execute_first()
        assert result == "found"

    def test_disabled_handler_skipped(self):
        hook = HookPoint("test")
        hook.register(lambda: "active", plugin_name="a")
        hook._handlers[0].enabled = False
        results = hook.execute()
        assert results == []

    def test_handler_call_count_tracked(self):
        hook = HookPoint("test")
        hook.register(lambda: 42, plugin_name="a")
        hook.execute()
        hook.execute()
        handlers = hook.get_handlers()
        assert handlers[0].call_count == 2

    def test_error_in_handler_returns_none(self):
        hook = HookPoint("test")
        hook.register(lambda: 1 / 0, plugin_name="bad")
        results = hook.execute()
        assert results == [None]


class TestHookSystem:
    """Tests for the HookSystem manager."""

    def test_define_hook(self):
        system = HookSystem()
        hook = system.define("on_request", description="Before request")
        assert hook.name == "on_request"

    def test_register_handler(self):
        system = HookSystem()
        system.define("on_request")
        success = system.register("on_request", lambda: "ok", "my_plugin")
        assert success is True

    def test_register_undefined_hook_fails(self):
        system = HookSystem()
        success = system.register("undefined", lambda: None, "plugin")
        assert success is False

    def test_execute_hook(self):
        system = HookSystem()
        system.define("greet")
        system.register("greet", lambda: "hello", "plugin_a")
        results = system.execute("greet")
        assert results == ["hello"]

    def test_execute_pipeline(self):
        system = HookSystem()
        system.define("transform")
        system.register("transform", lambda v: v.upper(), "plugin_a")
        result = system.execute_pipeline("transform", "hello")
        assert result == "HELLO"

    def test_unregister_plugin(self):
        system = HookSystem()
        system.define("hook_a")
        system.define("hook_b")
        system.register("hook_a", lambda: 1, "plugin_x")
        system.register("hook_b", lambda: 2, "plugin_x")
        removed = system.unregister_plugin("plugin_x")
        assert removed == 2

    def test_get_hook(self):
        system = HookSystem()
        system.define("my_hook")
        hook = system.get_hook("my_hook")
        assert hook is not None
        assert hook.name == "my_hook"

    def test_get_nonexistent_hook(self):
        system = HookSystem()
        assert system.get_hook("nope") is None
