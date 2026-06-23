"""Policy engine for access control."""
from __future__ import annotations

import fnmatch
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Capability(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    LIST = "list"
    SUDO = "sudo"
    DENY = "deny"


@dataclass
class PolicyRule:
    """A single rule in a policy."""
    path: str
    capabilities: set[Capability]
    min_wrapping_ttl: float = 0
    max_wrapping_ttl: float = 0
    required_parameters: list[str] = field(default_factory=list)
    denied_parameters: dict[str, list[str]] = field(default_factory=dict)
    allowed_parameters: dict[str, list[str]] = field(default_factory=dict)

    @property
    def is_deny(self) -> bool:
        return Capability.DENY in self.capabilities

    def matches_path(self, target_path: str) -> bool:
        """Check if this rule matches the given path."""
        if self.path.endswith("*"):
            prefix = self.path[:-1]
            return target_path.startswith(prefix) or target_path == prefix.rstrip("/")
        return self.path == target_path

    def has_capability(self, cap: Capability) -> bool:
        return cap in self.capabilities

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "capabilities": [c.value for c in self.capabilities],
        }


@dataclass
class Policy:
    """A named access control policy."""
    name: str
    rules: list[PolicyRule] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    description: str = ""

    def add_rule(self, rule: PolicyRule) -> None:
        self.rules.append(rule)
        self.updated_at = time.time()

    def remove_rules_for_path(self, path: str) -> int:
        before = len(self.rules)
        self.rules = [r for r in self.rules if r.path != path]
        removed = before - len(self.rules)
        if removed:
            self.updated_at = time.time()
        return removed

    def matching_rules(self, path: str) -> list[PolicyRule]:
        return [r for r in self.rules if r.matches_path(path)]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "rules": [r.to_dict() for r in self.rules],
            "description": self.description,
        }


@dataclass(frozen=True)
class AccessDecision:
    """Result of an access control evaluation."""
    allowed: bool
    matching_policies: list[str]
    capabilities: set[Capability]
    denied_by: str | None = None
    reason: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "matching_policies": self.matching_policies,
            "capabilities": [c.value for c in self.capabilities],
            "denied_by": self.denied_by,
            "reason": self.reason,
        }


class PolicyEngine:
    """Evaluates access control policies.

    Deny rules always override allow rules. Policies are evaluated by
    collecting all matching rules across all applicable policies, with
    explicit deny taking precedence regardless of order.
    """

    def __init__(self) -> None:
        self._policies: dict[str, Policy] = {}
        self._root_policy = Policy(name="root", rules=[
            PolicyRule(path="*", capabilities={
                Capability.READ, Capability.WRITE, Capability.DELETE,
                Capability.LIST, Capability.SUDO,
            }),
        ])

    def add_policy(self, name: str, rules: list[dict[str, Any]] | None = None) -> Policy:
        """Add or update a policy."""
        if name == "root":
            raise ValueError("cannot modify root policy")
        policy = Policy(name=name)
        if rules:
            for rule_data in rules:
                caps = {Capability(c) for c in rule_data.get("capabilities", [])}
                rule = PolicyRule(
                    path=rule_data["path"],
                    capabilities=caps,
                )
                policy.add_rule(rule)
        self._policies[name] = policy
        return policy

    def remove_policy(self, name: str) -> bool:
        if name == "root":
            raise ValueError("cannot remove root policy")
        return self._policies.pop(name, None) is not None

    def get_policy(self, name: str) -> Policy | None:
        if name == "root":
            return self._root_policy
        return self._policies.get(name)

    def list_policies(self) -> list[str]:
        return sorted(self._policies.keys())

    def evaluate(
        self,
        path: str,
        required_capability: Capability,
        policy_names: list[str],
    ) -> AccessDecision:
        """Evaluate whether the required capability is allowed on the path.

        Deny rules take precedence: if ANY matching rule in ANY policy
        explicitly denies the path, access is denied.
        """
        if "root" in policy_names:
            return AccessDecision(
                allowed=True,
                matching_policies=["root"],
                capabilities=set(Capability),
            )

        all_capabilities: set[Capability] = set()
        matching_policy_names: list[str] = []
        deny_source: str | None = None

        for policy_name in policy_names:
            policy = self._policies.get(policy_name)
            if policy is None:
                continue

            rules = policy.matching_rules(path)
            if not rules:
                continue

            matching_policy_names.append(policy_name)

            for rule in rules:
                if rule.is_deny:
                    deny_source = policy_name
                    return AccessDecision(
                        allowed=False,
                        matching_policies=matching_policy_names,
                        capabilities=set(),
                        denied_by=deny_source,
                        reason=f"explicitly denied by policy '{policy_name}' rule on '{rule.path}'",
                    )
                all_capabilities.update(rule.capabilities)

        if required_capability in all_capabilities:
            return AccessDecision(
                allowed=True,
                matching_policies=matching_policy_names,
                capabilities=all_capabilities,
            )

        return AccessDecision(
            allowed=False,
            matching_policies=matching_policy_names,
            capabilities=all_capabilities,
            reason=f"missing capability '{required_capability.value}' on path '{path}'",
        )

    def evaluate_bulk(
        self,
        requests: list[tuple[str, Capability]],
        policy_names: list[str],
    ) -> list[AccessDecision]:
        """Evaluate multiple access requests at once."""
        return [self.evaluate(path, cap, policy_names) for path, cap in requests]

    def effective_capabilities(self, path: str, policy_names: list[str]) -> set[Capability]:
        """Get all effective capabilities for a path across all policies."""
        if "root" in policy_names:
            return set(Capability) - {Capability.DENY}

        caps: set[Capability] = set()
        for policy_name in policy_names:
            policy = self._policies.get(policy_name)
            if policy is None:
                continue
            for rule in policy.matching_rules(path):
                if rule.is_deny:
                    return {Capability.DENY}
                caps.update(rule.capabilities)
        return caps

    def merge_policies(self, name: str, source_names: list[str]) -> Policy:
        """Create a new policy by merging rules from multiple policies."""
        merged = Policy(name=name)
        for src_name in source_names:
            src = self._policies.get(src_name)
            if src:
                for rule in src.rules:
                    merged.add_rule(PolicyRule(
                        path=rule.path,
                        capabilities=set(rule.capabilities),
                    ))
        self._policies[name] = merged
        return merged

    def policy_count(self) -> int:
        return len(self._policies)

    def validate_policy(self, policy: Policy) -> list[str]:
        """Validate a policy and return any warnings."""
        warnings: list[str] = []
        for rule in policy.rules:
            if not rule.path:
                warnings.append("empty path in rule")
            if not rule.capabilities:
                warnings.append(f"no capabilities for path '{rule.path}'")
            if rule.is_deny and len(rule.capabilities) > 1:
                warnings.append(f"deny combined with other capabilities on '{rule.path}'")
        return warnings


class PolicyTemplate:
    """Templated policy with variable substitution."""

    def __init__(self, name: str, template_rules: list[dict[str, Any]]) -> None:
        self._name = name
        self._template_rules = template_rules

    @property
    def name(self) -> str:
        return self._name

    def render(self, variables: dict[str, str]) -> Policy:
        """Render the template into a concrete Policy."""
        policy = Policy(name=self._name)
        for rule_tmpl in self._template_rules:
            path = rule_tmpl["path"]
            for var_name, var_value in variables.items():
                path = path.replace("{{" + var_name + "}}", var_value)
            caps = {Capability(c) for c in rule_tmpl.get("capabilities", [])}
            policy.add_rule(PolicyRule(path=path, capabilities=caps))
        return policy

    def required_variables(self) -> list[str]:
        """Extract variable names from template paths."""
        variables: list[str] = []
        for rule in self._template_rules:
            path = rule["path"]
            import re
            for m in re.finditer(r"\{\{(\w+)\}\}", path):
                name = m.group(1)
                if name not in variables:
                    variables.append(name)
        return variables


@dataclass
class PolicyVersion:
    """A versioned snapshot of a policy."""
    version: int
    policy_data: dict[str, Any]
    created_at: float = field(default_factory=time.time)
    author: str = ""
    comment: str = ""


class PolicyVersionStore:
    """Tracks policy versions for auditing and rollback."""

    def __init__(self) -> None:
        self._versions: dict[str, list[PolicyVersion]] = {}

    def save_version(self, policy: Policy, author: str = "", comment: str = "") -> PolicyVersion:
        """Save the current state of a policy as a new version."""
        if policy.name not in self._versions:
            self._versions[policy.name] = []
        version_num = len(self._versions[policy.name]) + 1
        pv = PolicyVersion(
            version=version_num,
            policy_data=policy.to_dict(),
            author=author,
            comment=comment,
        )
        self._versions[policy.name].append(pv)
        return pv

    def get_version(self, policy_name: str, version: int) -> PolicyVersion | None:
        versions = self._versions.get(policy_name, [])
        for pv in versions:
            if pv.version == version:
                return pv
        return None

    def list_versions(self, policy_name: str) -> list[PolicyVersion]:
        return list(self._versions.get(policy_name, []))

    def latest_version(self, policy_name: str) -> PolicyVersion | None:
        versions = self._versions.get(policy_name, [])
        return versions[-1] if versions else None

    @property
    def total_versions(self) -> int:
        return sum(len(v) for v in self._versions.values())


@dataclass
class PolicyDiffEntry:
    """A single difference between two policies."""
    diff_type: str
    path: str
    old_capabilities: set[Capability] | None = None
    new_capabilities: set[Capability] | None = None


class PolicyDiff:
    """Computes differences between two policies."""

    def diff(self, old_policy: Policy, new_policy: Policy) -> list[PolicyDiffEntry]:
        """Return a list of differences between two policies."""
        entries: list[PolicyDiffEntry] = []
        old_rules = {r.path: r for r in old_policy.rules}
        new_rules = {r.path: r for r in new_policy.rules}
        for path in sorted(set(list(old_rules.keys()) + list(new_rules.keys()))):
            old_rule = old_rules.get(path)
            new_rule = new_rules.get(path)
            if old_rule and not new_rule:
                entries.append(PolicyDiffEntry(
                    diff_type="removed",
                    path=path,
                    old_capabilities=old_rule.capabilities,
                ))
            elif new_rule and not old_rule:
                entries.append(PolicyDiffEntry(
                    diff_type="added",
                    path=path,
                    new_capabilities=new_rule.capabilities,
                ))
            elif old_rule and new_rule and old_rule.capabilities != new_rule.capabilities:
                entries.append(PolicyDiffEntry(
                    diff_type="modified",
                    path=path,
                    old_capabilities=old_rule.capabilities,
                    new_capabilities=new_rule.capabilities,
                ))
        return entries

    def summary(self, old_policy: Policy, new_policy: Policy) -> dict[str, int]:
        """Return counts of added, removed, modified rules."""
        diffs = self.diff(old_policy, new_policy)
        counts: dict[str, int] = {"added": 0, "removed": 0, "modified": 0}
        for d in diffs:
            counts[d.diff_type] = counts.get(d.diff_type, 0) + 1
        return counts


class PathACLComputer:
    """Computes the effective ACL for a specific path across all policies."""

    def __init__(self, engine: PolicyEngine) -> None:
        self._engine = engine

    def compute_acl(self, path: str, policy_names: list[str]) -> dict[str, bool]:
        """Return a map of capability -> allowed for the given path."""
        acl: dict[str, bool] = {}
        caps = self._engine.effective_capabilities(path, policy_names)
        if Capability.DENY in caps:
            for c in Capability:
                if c != Capability.DENY:
                    acl[c.value] = False
            return acl
        for c in Capability:
            if c != Capability.DENY:
                acl[c.value] = c in caps
        return acl

    def compute_acl_tree(self, paths: list[str], policy_names: list[str]) -> dict[str, dict[str, bool]]:
        """Compute ACLs for multiple paths."""
        return {path: self.compute_acl(path, policy_names) for path in paths}


class PolicySimulator:
    """Simulates policy evaluation for what-if analysis."""

    def __init__(self, engine: PolicyEngine) -> None:
        self._engine = engine

    def simulate(
        self,
        path: str,
        capability: Capability,
        policy_names: list[str],
        hypothetical_rules: list[dict[str, Any]] | None = None,
    ) -> AccessDecision:
        """Simulate an access decision, optionally with hypothetical rules."""
        if hypothetical_rules:
            temp_name = f"__sim_{id(self)}"
            self._engine.add_policy(temp_name, hypothetical_rules)
            all_policies = policy_names + [temp_name]
            result = self._engine.evaluate(path, capability, all_policies)
            self._engine.remove_policy(temp_name)
            return result
        return self._engine.evaluate(path, capability, policy_names)

    def batch_simulate(
        self,
        requests: list[tuple[str, Capability]],
        policy_names: list[str],
    ) -> list[AccessDecision]:
        return [self.simulate(path, cap, policy_names) for path, cap in requests]


@dataclass
class ConditionalPolicyRule:
    """A policy rule with conditions."""
    path: str
    capabilities: set[Capability]
    conditions: dict[str, Any] = field(default_factory=dict)
    time_restrictions: dict[str, float] | None = None

    def evaluate_conditions(self, context: dict[str, Any]) -> bool:
        """Check if all conditions are satisfied."""
        for key, expected in self.conditions.items():
            actual = context.get(key)
            if actual != expected:
                return False
        if self.time_restrictions:
            now = context.get("_time", time.time())
            start = self.time_restrictions.get("start", 0)
            end = self.time_restrictions.get("end", float("inf"))
            if not (start <= now <= end):
                return False
        return True


class ConditionalPolicyEngine:
    """Extension of PolicyEngine that supports conditional rules."""

    def __init__(self) -> None:
        self._conditional_rules: dict[str, list[ConditionalPolicyRule]] = {}

    def add_conditional_rule(self, policy_name: str, rule: ConditionalPolicyRule) -> None:
        if policy_name not in self._conditional_rules:
            self._conditional_rules[policy_name] = []
        self._conditional_rules[policy_name].append(rule)

    def evaluate(
        self,
        path: str,
        capability: Capability,
        policy_names: list[str],
        context: dict[str, Any] | None = None,
    ) -> bool:
        """Evaluate conditional rules with context."""
        ctx = context or {}
        for policy_name in policy_names:
            rules = self._conditional_rules.get(policy_name, [])
            for rule in rules:
                if not rule.evaluate_conditions(ctx):
                    continue
                if fnmatch.fnmatch(path, rule.path) or path.startswith(rule.path.rstrip("*")):
                    if Capability.DENY in rule.capabilities:
                        return False
                    if capability in rule.capabilities:
                        return True
        return False

    def list_rules(self, policy_name: str) -> list[ConditionalPolicyRule]:
        return list(self._conditional_rules.get(policy_name, []))

    def remove_rules(self, policy_name: str) -> int:
        rules = self._conditional_rules.pop(policy_name, [])
        return len(rules)
