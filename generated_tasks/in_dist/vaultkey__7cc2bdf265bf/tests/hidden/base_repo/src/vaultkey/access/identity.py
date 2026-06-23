"""Identity management — entities, aliases, and groups."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from vaultkey.crypto.random import generate_id
from vaultkey.utils.errors import VaultError


@dataclass
class EntityAlias:
    """An alias linking an entity to an auth backend."""
    alias_id: str
    name: str
    auth_backend: str
    entity_id: str
    created_at: float = field(default_factory=time.time)
    metadata: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "alias_id": self.alias_id,
            "name": self.name,
            "auth_backend": self.auth_backend,
            "entity_id": self.entity_id,
            "metadata": dict(self.metadata),
        }


@dataclass
class Entity:
    """A unique identity in the vault."""
    entity_id: str
    name: str
    policies: list[str] = field(default_factory=list)
    aliases: dict[str, EntityAlias] = field(default_factory=dict)
    metadata: dict[str, str] = field(default_factory=dict)
    disabled: bool = False
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_alias(self, alias: EntityAlias) -> None:
        self.aliases[alias.alias_id] = alias
        self.updated_at = time.time()

    def remove_alias(self, alias_id: str) -> bool:
        removed = self.aliases.pop(alias_id, None) is not None
        if removed:
            self.updated_at = time.time()
        return removed

    def add_policy(self, policy_name: str) -> None:
        if policy_name not in self.policies:
            self.policies.append(policy_name)
            self.updated_at = time.time()

    def remove_policy(self, policy_name: str) -> bool:
        if policy_name in self.policies:
            self.policies.remove(policy_name)
            self.updated_at = time.time()
            return True
        return False

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "name": self.name,
            "policies": list(self.policies),
            "aliases": {k: v.to_dict() for k, v in self.aliases.items()},
            "metadata": dict(self.metadata),
            "disabled": self.disabled,
        }


@dataclass
class Group:
    """A group of entities sharing policies."""
    group_id: str
    name: str
    policies: list[str] = field(default_factory=list)
    member_entity_ids: list[str] = field(default_factory=list)
    parent_group_ids: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)
    group_type: str = "internal"
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_member(self, entity_id: str) -> None:
        if entity_id not in self.member_entity_ids:
            self.member_entity_ids.append(entity_id)
            self.updated_at = time.time()

    def remove_member(self, entity_id: str) -> bool:
        if entity_id in self.member_entity_ids:
            self.member_entity_ids.remove(entity_id)
            self.updated_at = time.time()
            return True
        return False

    def add_policy(self, policy_name: str) -> None:
        if policy_name not in self.policies:
            self.policies.append(policy_name)
            self.updated_at = time.time()

    def remove_policy(self, policy_name: str) -> bool:
        if policy_name in self.policies:
            self.policies.remove(policy_name)
            self.updated_at = time.time()
            return True
        return False

    def add_parent(self, group_id: str) -> None:
        if group_id not in self.parent_group_ids:
            self.parent_group_ids.append(group_id)
            self.updated_at = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "group_id": self.group_id,
            "name": self.name,
            "policies": list(self.policies),
            "member_entity_ids": list(self.member_entity_ids),
            "parent_group_ids": list(self.parent_group_ids),
            "group_type": self.group_type,
            "metadata": dict(self.metadata),
        }


class IdentityStore:
    """Manages entities, aliases, and groups."""

    def __init__(self) -> None:
        self._entities: dict[str, Entity] = {}
        self._groups: dict[str, Group] = {}
        self._alias_index: dict[str, str] = {}
        self._name_index: dict[str, str] = {}
        self._group_name_index: dict[str, str] = {}

    def create_entity(self, name: str, policies: list[str] | None = None, metadata: dict[str, str] | None = None) -> Entity:
        if name in self._name_index:
            raise VaultError(f"entity already exists: {name}")
        entity_id = generate_id("entity")
        entity = Entity(
            entity_id=entity_id,
            name=name,
            policies=list(policies or []),
            metadata=dict(metadata or {}),
        )
        self._entities[entity_id] = entity
        self._name_index[name] = entity_id
        return entity

    def get_entity(self, entity_id: str) -> Entity | None:
        return self._entities.get(entity_id)

    def get_entity_by_name(self, name: str) -> Entity | None:
        eid = self._name_index.get(name)
        if eid:
            return self._entities.get(eid)
        return None

    def delete_entity(self, entity_id: str) -> bool:
        entity = self._entities.pop(entity_id, None)
        if entity is None:
            return False
        self._name_index.pop(entity.name, None)
        for alias in entity.aliases.values():
            alias_key = f"{alias.auth_backend}:{alias.name}"
            self._alias_index.pop(alias_key, None)
        for group in self._groups.values():
            if entity_id in group.member_entity_ids:
                group.member_entity_ids.remove(entity_id)
        return True

    def list_entities(self) -> list[Entity]:
        return list(self._entities.values())

    def create_alias(self, entity_id: str, name: str, auth_backend: str) -> EntityAlias:
        entity = self._entities.get(entity_id)
        if entity is None:
            raise VaultError(f"entity not found: {entity_id}")

        alias_key = f"{auth_backend}:{name}"
        if alias_key in self._alias_index:
            raise VaultError(f"alias already exists: {name} on {auth_backend}")

        alias = EntityAlias(
            alias_id=generate_id("alias"),
            name=name,
            auth_backend=auth_backend,
            entity_id=entity_id,
        )
        entity.add_alias(alias)
        self._alias_index[alias_key] = entity_id
        return alias

    def lookup_by_alias(self, name: str, auth_backend: str) -> Entity | None:
        alias_key = f"{auth_backend}:{name}"
        entity_id = self._alias_index.get(alias_key)
        if entity_id:
            return self._entities.get(entity_id)
        return None

    def create_group(self, name: str, policies: list[str] | None = None, member_entity_ids: list[str] | None = None) -> Group:
        if name in self._group_name_index:
            raise VaultError(f"group already exists: {name}")
        group_id = generate_id("group")
        group = Group(
            group_id=group_id,
            name=name,
            policies=list(policies or []),
            member_entity_ids=list(member_entity_ids or []),
        )
        self._groups[group_id] = group
        self._group_name_index[name] = group_id
        return group

    def get_group(self, group_id: str) -> Group | None:
        return self._groups.get(group_id)

    def get_group_by_name(self, name: str) -> Group | None:
        gid = self._group_name_index.get(name)
        if gid:
            return self._groups.get(gid)
        return None

    def delete_group(self, group_id: str) -> bool:
        group = self._groups.pop(group_id, None)
        if group is None:
            return False
        self._group_name_index.pop(group.name, None)
        return True

    def list_groups(self) -> list[Group]:
        return list(self._groups.values())

    def entity_groups(self, entity_id: str) -> list[Group]:
        return [g for g in self._groups.values() if entity_id in g.member_entity_ids]

    def resolve_policies(self, entity_id: str) -> list[str]:
        """Resolve all policies for an entity, including inherited group policies."""
        entity = self._entities.get(entity_id)
        if entity is None:
            return []

        policies: list[str] = list(entity.policies)
        visited_groups: set[str] = set()
        groups = self.entity_groups(entity_id)

        for group in groups:
            self._collect_group_policies(group, policies, visited_groups)

        return list(dict.fromkeys(policies))

    def _collect_group_policies(self, group: Group, policies: list[str], visited: set[str]) -> None:
        """Recursively collect policies from a group and its parents."""
        if group.group_id in visited:
            return
        visited.add(group.group_id)

        policies.extend(group.policies)

        for parent_id in group.parent_group_ids:
            parent = self._groups.get(parent_id)
            if parent:
                self._collect_group_policies(parent, policies, visited)

    def entity_count(self) -> int:
        return len(self._entities)

    def group_count(self) -> int:
        return len(self._groups)

    def merge_entities(self, source_id: str, target_id: str) -> Entity | None:
        """Merge source entity into target, transferring aliases and policies."""
        source = self._entities.get(source_id)
        target = self._entities.get(target_id)
        if source is None or target is None:
            return None
        for alias in list(source.aliases.values()):
            alias_key = f"{alias.auth_backend}:{alias.name}"
            alias.entity_id = target_id
            target.add_alias(alias)
            self._alias_index[alias_key] = target_id
        for policy in source.policies:
            target.add_policy(policy)
        for key, value in source.metadata.items():
            if key not in target.metadata:
                target.metadata[key] = value
        for group in self._groups.values():
            if source_id in group.member_entity_ids:
                group.member_entity_ids.remove(source_id)
                group.add_member(target_id)
        self._entities.pop(source_id, None)
        self._name_index.pop(source.name, None)
        target.updated_at = time.time()
        return target

    def walk_group_hierarchy(self, group_id: str) -> list[Group]:
        """Walk up the group hierarchy from the given group."""
        result: list[Group] = []
        visited: set[str] = set()
        self._walk_hierarchy(group_id, result, visited)
        return result

    def _walk_hierarchy(self, group_id: str, result: list[Group], visited: set[str]) -> None:
        if group_id in visited:
            return
        visited.add(group_id)
        group = self._groups.get(group_id)
        if group is None:
            return
        result.append(group)
        for parent_id in group.parent_group_ids:
            self._walk_hierarchy(parent_id, result, visited)

    def group_descendants(self, group_id: str) -> list[Group]:
        """Find all child groups of the given group."""
        descendants: list[Group] = []
        for g in self._groups.values():
            if group_id in g.parent_group_ids:
                descendants.append(g)
                descendants.extend(self.group_descendants(g.group_id))
        return descendants

    def sync_entity_policies(self, entity_id: str, external_policies: list[str]) -> Entity | None:
        """Synchronize an entity's policies with an external source."""
        entity = self._entities.get(entity_id)
        if entity is None:
            return None
        entity.policies = list(external_policies)
        entity.updated_at = time.time()
        return entity

    def sync_group_membership(self, group_id: str, entity_ids: list[str]) -> Group | None:
        """Set the exact membership list for a group."""
        group = self._groups.get(group_id)
        if group is None:
            return None
        group.member_entity_ids = list(entity_ids)
        group.updated_at = time.time()
        return group


@dataclass
class EntityProfile:
    """Extended profile information for an entity."""
    entity_id: str
    display_name: str = ""
    email: str = ""
    department: str = ""
    tags: list[str] = field(default_factory=list)
    custom_fields: dict[str, str] = field(default_factory=dict)
    last_active: float | None = None
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "display_name": self.display_name,
            "email": self.email,
            "department": self.department,
            "tags": list(self.tags),
            "last_active": self.last_active,
        }


class EntityProfileStore:
    """Stores extended profile data for entities."""

    def __init__(self) -> None:
        self._profiles: dict[str, EntityProfile] = {}

    def set_profile(self, profile: EntityProfile) -> None:
        self._profiles[profile.entity_id] = profile

    def get_profile(self, entity_id: str) -> EntityProfile | None:
        return self._profiles.get(entity_id)

    def update_profile(self, entity_id: str, **kwargs: Any) -> EntityProfile | None:
        profile = self._profiles.get(entity_id)
        if profile is None:
            return None
        for key, value in kwargs.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        return profile

    def delete_profile(self, entity_id: str) -> bool:
        return self._profiles.pop(entity_id, None) is not None

    def find_by_department(self, department: str) -> list[EntityProfile]:
        return [p for p in self._profiles.values() if p.department == department]

    def find_by_tag(self, tag: str) -> list[EntityProfile]:
        return [p for p in self._profiles.values() if tag in p.tags]

    @property
    def profile_count(self) -> int:
        return len(self._profiles)


class IdentitySearch:
    """Search across entities and groups."""

    def __init__(self, store: IdentityStore) -> None:
        self._store = store

    def search_entities(
        self,
        query: str = "",
        policy: str | None = None,
        disabled: bool | None = None,
    ) -> list[Entity]:
        """Search entities by name substring, policy, or disabled status."""
        results = self._store.list_entities()
        if query:
            lower_q = query.lower()
            results = [e for e in results if lower_q in e.name.lower()]
        if policy is not None:
            results = [e for e in results if policy in e.policies]
        if disabled is not None:
            results = [e for e in results if e.disabled == disabled]
        return results

    def search_groups(
        self,
        query: str = "",
        policy: str | None = None,
    ) -> list[Group]:
        """Search groups by name substring or policy."""
        results = self._store.list_groups()
        if query:
            lower_q = query.lower()
            results = [g for g in results if lower_q in g.name.lower()]
        if policy is not None:
            results = [g for g in results if policy in g.policies]
        return results

    def find_entities_without_groups(self) -> list[Entity]:
        """Find entities that don't belong to any group."""
        return [
            e for e in self._store.list_entities()
            if not self._store.entity_groups(e.entity_id)
        ]

    def find_orphan_groups(self) -> list[Group]:
        """Find groups with no members."""
        return [g for g in self._store.list_groups() if not g.member_entity_ids]


class BulkIdentityOperations:
    """Bulk operations on identities."""

    def __init__(self, store: IdentityStore) -> None:
        self._store = store

    def bulk_create_entities(
        self,
        names: list[str],
        default_policies: list[str] | None = None,
    ) -> list[Entity]:
        results: list[Entity] = []
        for name in names:
            try:
                entity = self._store.create_entity(name, policies=default_policies)
                results.append(entity)
            except VaultError:
                continue
        return results

    def bulk_disable_entities(self, entity_ids: list[str]) -> int:
        count = 0
        for eid in entity_ids:
            entity = self._store.get_entity(eid)
            if entity and not entity.disabled:
                entity.disabled = True
                entity.updated_at = time.time()
                count += 1
        return count

    def bulk_enable_entities(self, entity_ids: list[str]) -> int:
        count = 0
        for eid in entity_ids:
            entity = self._store.get_entity(eid)
            if entity and entity.disabled:
                entity.disabled = False
                entity.updated_at = time.time()
                count += 1
        return count

    def bulk_add_policy(self, entity_ids: list[str], policy_name: str) -> int:
        count = 0
        for eid in entity_ids:
            entity = self._store.get_entity(eid)
            if entity:
                entity.add_policy(policy_name)
                count += 1
        return count

    def bulk_remove_policy(self, entity_ids: list[str], policy_name: str) -> int:
        count = 0
        for eid in entity_ids:
            entity = self._store.get_entity(eid)
            if entity and entity.remove_policy(policy_name):
                count += 1
        return count

    def bulk_delete_entities(self, entity_ids: list[str]) -> int:
        count = 0
        for eid in entity_ids:
            if self._store.delete_entity(eid):
                count += 1
        return count
