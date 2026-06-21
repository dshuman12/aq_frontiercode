"""Role-based access control (RBAC) permission system."""

from __future__ import annotations

import fnmatch
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional, Set

logger = logging.getLogger(__name__)


class PermissionDeniedError(Exception):
    """Raised when a permission check fails."""
    def __init__(self, resource: str, action: str, user_id: str = "") -> None:
        self.resource = resource
        self.action = action
        self.user_id = user_id
        super().__init__(
            f"Permission denied: user '{user_id}' cannot '{action}' on '{resource}'"
        )


class Action(Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


@dataclass
class Permission:
    """
    A permission grants an action on a resource pattern.

    Resources use dotted hierarchy: "users.profile", "admin.settings"
    Wildcards: "users.*" matches "users.profile", "users.settings", etc.
    """
    resource: str
    action: Action
    conditions: dict[str, Any] = field(default_factory=dict)

    @property
    def is_wildcard(self) -> bool:
        return "*" in self.resource

    def matches(self, resource: str, action: Action) -> bool:
        """
        Check if this permission matches a given resource and action.

        BUG CANDIDATE #7: The wildcard matching has a subtle bug.
        Permission "users.*" should match "users.profile" and "users.settings"
        but should NOT match just "users" (the parent itself).

        However, the fnmatch-based matching treats "users.*" as a glob pattern,
        which means "users.*" matches "users.X" for any single component X,
        but does NOT match "users.profile.avatar" (nested deeper).

        The real bug: when action is Action.ADMIN, the permission should cascade
        to all sub-resources AND all sub-actions. But the current implementation
        only checks exact action match, so "admin" permission on "users" doesn't
        grant "read" permission on "users.profile".
        """
        if self.action != action and self.action != Action.ADMIN:
            return False

        # Check resource pattern
        if self.resource == resource:
            return True

        if self.is_wildcard:
            return fnmatch.fnmatch(resource, self.resource)

        return False

    def __hash__(self) -> int:
        return hash((self.resource, self.action))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Permission):
            return NotImplemented
        return self.resource == other.resource and self.action == other.action


@dataclass
class Role:
    """A named role with a set of permissions."""
    name: str
    permissions: set[Permission] = field(default_factory=set)
    parent_roles: list[str] = field(default_factory=list)
    description: str = ""

    def add_permission(self, resource: str, action: Action, **conditions) -> None:
        self.permissions.add(Permission(resource=resource, action=action, conditions=conditions))

    def remove_permission(self, resource: str, action: Action) -> bool:
        perm = Permission(resource=resource, action=action)
        if perm in self.permissions:
            self.permissions.discard(perm)
            return True
        return False

    def has_permission(self, resource: str, action: Action) -> bool:
        return any(p.matches(resource, action) for p in self.permissions)


class PermissionRegistry:
    """
    Central registry for roles and permission checking.

    Supports role hierarchy — a role can inherit from parent roles.

    BUG CANDIDATE #7: The role hierarchy resolution has a cycle detection bug.
    If Role A inherits from Role B and Role B inherits from Role A (circular),
    the _resolve_permissions method enters infinite recursion. The cycle detection
    uses a `visited` set but it's checked AFTER the recursive call, not before.
    """

    def __init__(self) -> None:
        self._roles: dict[str, Role] = {}
        self._user_roles: dict[str, set[str]] = {}

    def register_role(self, role: Role) -> None:
        """Register a role in the registry."""
        self._roles[role.name] = role
        logger.debug(f"Registered role: {role.name} with {len(role.permissions)} permissions")

    def get_role(self, name: str) -> Optional[Role]:
        return self._roles.get(name)

    def assign_role(self, user_id: str, role_name: str) -> None:
        """Assign a role to a user."""
        if role_name not in self._roles:
            raise ValueError(f"Role '{role_name}' not found")
        if user_id not in self._user_roles:
            self._user_roles[user_id] = set()
        self._user_roles[user_id].add(role_name)

    def revoke_role(self, user_id: str, role_name: str) -> bool:
        """Revoke a role from a user."""
        if user_id in self._user_roles:
            return self._user_roles[user_id].discard(role_name) is None and role_name in self._roles
        return False

    def get_user_roles(self, user_id: str) -> set[str]:
        """Get all role names assigned to a user."""
        return self._user_roles.get(user_id, set()).copy()

    def check_permission(
        self,
        user_id: str,
        resource: str,
        action: Action,
        raise_on_deny: bool = True,
    ) -> bool:
        """
        Check if a user has permission to perform an action on a resource.

        Resolves role hierarchy and checks all inherited permissions.
        """
        user_roles = self._user_roles.get(user_id, set())
        if not user_roles:
            if raise_on_deny:
                raise PermissionDeniedError(resource, action.value, user_id)
            return False

        # Collect all permissions from all roles (including inherited)
        all_permissions = self._resolve_user_permissions(user_id)

        # Check if any permission matches
        for perm in all_permissions:
            if perm.matches(resource, action):
                return True

        if raise_on_deny:
            raise PermissionDeniedError(resource, action.value, user_id)
        return False

    def _resolve_user_permissions(self, user_id: str) -> set[Permission]:
        """Resolve all permissions for a user, including inherited ones."""
        all_perms: set[Permission] = set()
        user_roles = self._user_roles.get(user_id, set())

        for role_name in user_roles:
            role_perms = self._resolve_role_permissions(role_name, visited=set())
            all_perms.update(role_perms)

        return all_perms

    def _resolve_role_permissions(
        self, role_name: str, visited: set[str]
    ) -> set[Permission]:
        """
        Recursively resolve all permissions for a role, following parent hierarchy.

        BUG: The cycle detection checks `visited` after processing, not before.
        This means a cycle A->B->A will recurse once before being caught.
        For small cycles this wastes work; for larger cycles with side effects
        it could cause incorrect permission accumulation.
        """
        role = self._roles.get(role_name)
        if role is None:
            logger.warning(f"Role '{role_name}' not found during resolution")
            return set()

        perms = role.permissions.copy()

        # Add parent role permissions
        for parent_name in role.parent_roles:
            if parent_name in visited:
                logger.warning(f"Circular role inheritance detected: {parent_name}")
                continue
            visited.add(role_name)
            parent_perms = self._resolve_role_permissions(parent_name, visited)
            perms.update(parent_perms)

        return perms

    def get_effective_permissions(self, user_id: str) -> list[dict[str, str]]:
        """Get a human-readable list of effective permissions for a user."""
        perms = self._resolve_user_permissions(user_id)
        return [
            {"resource": p.resource, "action": p.action.value}
            for p in sorted(perms, key=lambda p: (p.resource, p.action.value))
        ]
