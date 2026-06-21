"""Tests for nexusflow.auth.permissions RBAC system."""

import pytest

from nexusflow.auth.permissions import (
    Action,
    Permission,
    PermissionDeniedError,
    PermissionRegistry,
    Role,
)


class TestPermission:
    """Tests for the Permission dataclass."""

    def test_exact_match(self):
        perm = Permission(resource="posts", action=Action.READ)
        assert perm.matches("posts", Action.READ) is True

    def test_no_match_wrong_action(self):
        perm = Permission(resource="posts", action=Action.READ)
        assert perm.matches("posts", Action.DELETE) is False

    def test_no_match_wrong_resource(self):
        perm = Permission(resource="posts", action=Action.READ)
        assert perm.matches("users", Action.READ) is False

    def test_wildcard_matches_children(self):
        perm = Permission(resource="users.*", action=Action.READ)
        assert perm.matches("users.profile", Action.READ) is True
        assert perm.matches("users.settings", Action.READ) is True

    def test_wildcard_no_match_parent(self):
        perm = Permission(resource="users.*", action=Action.READ)
        assert perm.matches("users", Action.READ) is False

    def test_admin_action_grants_any_action(self):
        perm = Permission(resource="*", action=Action.ADMIN)
        assert perm.matches("posts", Action.ADMIN) is True
        # Admin should match any action since action check passes for ADMIN
        assert perm.matches("users", Action.READ) is True

    def test_is_wildcard_property(self):
        assert Permission(resource="*", action=Action.READ).is_wildcard is True
        assert Permission(resource="posts", action=Action.READ).is_wildcard is False

    def test_permission_hash_equality(self):
        p1 = Permission(resource="posts", action=Action.READ)
        p2 = Permission(resource="posts", action=Action.READ)
        assert p1 == p2
        assert hash(p1) == hash(p2)


class TestRole:
    """Tests for the Role dataclass."""

    def test_add_permission(self):
        role = Role(name="editor")
        role.add_permission("posts", Action.CREATE)
        assert role.has_permission("posts", Action.CREATE) is True

    def test_remove_permission(self):
        role = Role(name="editor")
        role.add_permission("posts", Action.CREATE)
        assert role.remove_permission("posts", Action.CREATE) is True
        assert role.has_permission("posts", Action.CREATE) is False

    def test_remove_nonexistent_permission(self):
        role = Role(name="editor")
        assert role.remove_permission("posts", Action.DELETE) is False

    def test_has_permission_with_wildcard(self):
        role = Role(name="admin")
        role.add_permission("*", Action.ADMIN)
        assert role.has_permission("anything", Action.ADMIN) is True


class TestPermissionRegistry:
    """Tests for the PermissionRegistry."""

    def test_register_and_retrieve_role(self, permission_registry):
        admin = permission_registry.get_role("admin")
        assert admin is not None
        assert admin.name == "admin"

    def test_assign_role_to_user(self, permission_registry):
        permission_registry.assign_role("user-1", "admin")
        roles = permission_registry.get_user_roles("user-1")
        assert "admin" in roles

    def test_assign_unknown_role_raises(self, permission_registry):
        with pytest.raises(ValueError, match="not found"):
            permission_registry.assign_role("user-1", "nonexistent")

    def test_revoke_role(self, permission_registry):
        permission_registry.assign_role("user-1", "viewer")
        permission_registry.revoke_role("user-1", "viewer")
        roles = permission_registry.get_user_roles("user-1")
        assert "viewer" not in roles

    def test_check_permission_admin_wildcard(self, permission_registry):
        permission_registry.assign_role("user-1", "admin")
        assert permission_registry.check_permission(
            "user-1", "anything", Action.ADMIN
        ) is True

    def test_check_permission_viewer_read(self, permission_registry):
        permission_registry.assign_role("user-1", "viewer")
        assert permission_registry.check_permission(
            "user-1", "posts", Action.READ
        ) is True

    def test_check_permission_viewer_cannot_write(self, permission_registry):
        permission_registry.assign_role("user-1", "viewer")
        with pytest.raises(PermissionDeniedError):
            permission_registry.check_permission(
                "user-1", "posts", Action.CREATE
            )

    def test_check_permission_no_raise(self, permission_registry):
        permission_registry.assign_role("user-1", "viewer")
        result = permission_registry.check_permission(
            "user-1", "posts", Action.DELETE, raise_on_deny=False
        )
        assert result is False

    def test_no_roles_denies(self, permission_registry):
        with pytest.raises(PermissionDeniedError):
            permission_registry.check_permission("orphan", "posts", Action.READ)


class TestRoleHierarchy:
    """Tests for role hierarchy resolution."""

    def test_editor_inherits_viewer_read(self, permission_registry):
        permission_registry.assign_role("user-1", "editor")
        # Editor inherits from viewer, so READ on posts should work
        assert permission_registry.check_permission(
            "user-1", "posts", Action.READ
        ) is True

    def test_editor_has_own_permissions(self, permission_registry):
        permission_registry.assign_role("user-1", "editor")
        assert permission_registry.check_permission(
            "user-1", "posts", Action.CREATE
        ) is True

    def test_effective_permissions(self, permission_registry):
        permission_registry.assign_role("user-1", "editor")
        perms = permission_registry.get_effective_permissions("user-1")
        actions = {p["action"] for p in perms}
        assert "read" in actions
        assert "create" in actions
        assert "update" in actions

    def test_user_with_no_roles_gets_empty_perms(self, permission_registry):
        perms = permission_registry.get_effective_permissions("ghost")
        assert perms == []
