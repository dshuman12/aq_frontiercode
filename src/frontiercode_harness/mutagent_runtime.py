"""Concrete collaborators that make `mutagent` usable in the harness.

`mutagent.Mutagent` is written against two Protocols — `TestRunner` and
`LLMAdapter`. This module supplies real implementations:

- `SubprocessTestRunner` overlays a reference test into a repo copy, runs a
  shell command, and best-effort classifies the failure (compile/link vs
  assertion) so `classify_failure` can decide cosmetic-vs-behavioral.
- `InferenceLLMAdapter` asks the inference API for a minimal unified diff that
  realigns the reference test to the agent's incidental naming/strings.

`build_mutagent` wires them together with the static-diff guardrail. When no
LLM key is configured the adapter raises, so `Mutagent` simply falls back to a
rigid classical grade (baseline step 1) — never weaker than classical.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

from .inference import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    build_inference_payload,
    extract_inference_content,
    format_http_error,
    inference_headers,
    normalize_base_url,
)
from .mutagent import Contract, Mutagent, RunResult
from .static_diff import StaticDiffChecker


_COMPILE_MARKERS = (
    "error: ",
    "fatal error",
    "undefined reference",
    "cannot find symbol",
    "no such file",
    "is not defined",
    "cannot find module",
    "modulenotfounderror",
    "importerror",
    "syntaxerror",
    "compilation terminated",
)
_LINK_MARKERS = ("undefined reference", "linker", "ld returned", "unresolved external")


class SubprocessTestRunner:
    """Run a reference test against a repo copy via a shell command."""

    def __init__(self, command: str, *, overlay_rel: str | None = None, timeout: int = 600) -> None:
        self.command = command
        self.overlay_rel = overlay_rel
        self.timeout = timeout

    def run(self, test_file: Path, repo: Path) -> RunResult:
        if self.overlay_rel:
            target = repo / self.overlay_rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(test_file, target)
        env = os.environ.copy()
        env.setdefault("CI", "1")
        try:
            completed = subprocess.run(
                self.command,
                cwd=repo,
                env=env,
                shell=True,
                text=True,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=self.timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            return RunResult(
                passed=False,
                returncode=124,
                stdout=_as_text(exc.stdout),
                stderr=f"timed out after {self.timeout}s",
                failure_category="timeout",
            )
        passed = completed.returncode == 0
        category, assert_kind = _classify_output(completed.stdout, completed.stderr, passed)
        return RunResult(
            passed=passed,
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
            failure_category=category,
            assert_expected_kind=assert_kind,
        )


def _classify_output(stdout: str, stderr: str, passed: bool) -> tuple[str | None, str | None]:
    if passed:
        return None, None
    blob = f"{stdout}\n{stderr}".lower()
    if any(marker in blob for marker in _LINK_MARKERS):
        return "link", None
    if any(marker in blob for marker in _COMPILE_MARKERS):
        return "compile", None
    # Heuristic: a quoted-string mismatch in assertion output reads as a string literal.
    if ("expected" in blob or "assert" in blob) and ('"' in (stdout + stderr) or "'" in (stdout + stderr)):
        return "assert", "string_literal"
    if "assert" in blob or "expect" in blob:
        return "assert", "value"
    return None, None


class InferenceLLMAdapter:
    """LLMAdapter that requests a minimal realignment diff from the inference API."""

    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: int = 120,
    ) -> None:
        self.model = model or os.environ.get("MODEL", DEFAULT_MODEL)
        self.base_url = normalize_base_url(base_url or os.environ.get("QA_BASE_URL") or DEFAULT_BASE_URL)
        self.api_key = api_key or os.environ.get("QA_API_KEY")
        self.timeout_seconds = timeout_seconds

    def propose_diff(self, failing_test, failure_output, agent_code_slice, contract) -> str:
        if not self.api_key:
            raise RuntimeError("QA_API_KEY is required for mutagent adaptation")
        system_prompt = (
            "You realign a reference test to an agent's incidental implementation "
            "choices (identifier names, string-literal wording, import paths, call "
            "syntax) WITHOUT weakening any assertion. Never change assertion counts, "
            "comparison operators, numeric/boolean expectations, or control flow. "
            "Return ONLY a unified diff against the test file, no prose."
        )
        user_prompt = (
            f"Allowed token kinds: {sorted(contract.allowed_kinds)}\n"
            f"Do NOT touch these load-bearing strings: {list(contract.denied_string_literals)}\n\n"
            f"Reference test:\n{failing_test}\n\n"
            f"Failure output:\n{failure_output}\n\n"
            f"Agent code (for names/strings):\n{agent_code_slice}\n"
        )
        payload = build_inference_payload(
            model=self.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            feature="mutagent-adapt",
        )
        request = urllib.request.Request(
            f"{self.base_url}/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers=inference_headers(self.api_key),
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                response_data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"mutagent adapter request failed: {format_http_error(exc)}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError(f"mutagent adapter request failed: {exc}") from exc
        return _strip_diff_fence(extract_inference_content(response_data))


def build_mutagent(
    command: str,
    *,
    overlay_rel: str | None = None,
    timeout: int = 600,
    adapter: InferenceLLMAdapter | None = None,
) -> Mutagent:
    return Mutagent(
        runner=SubprocessTestRunner(command, overlay_rel=overlay_rel, timeout=timeout),
        adapter=adapter or InferenceLLMAdapter(),
        checker=StaticDiffChecker(),
    )


def _strip_diff_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


def _as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


__all__ = ["SubprocessTestRunner", "InferenceLLMAdapter", "build_mutagent", "Contract"]
