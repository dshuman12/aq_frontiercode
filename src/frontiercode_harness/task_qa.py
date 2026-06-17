from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol, TextIO

from .manifest import ManifestError, find_manifest_path, load_manifest
from .inference import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    build_inference_payload,
    extract_inference_content,
    format_http_error,
    inference_headers,
    normalize_base_url,
)
from .qa import discover_task_paths, evaluate_patch_text, qa_task


PROMPT_VERSION = "frontiercode-task-qa-v1"
DEFAULT_MAX_FILE_BYTES = 20_000
DEFAULT_MAX_CONTEXT_CHARS = 120_000
DEFAULT_MAX_TREE_FILES = 500
DEFAULT_ADVERSARIAL_MAX_REPO_FILES = 160
DEFAULT_ADVERSARIAL_MAX_TEST_FILES = 300
FALSE_POSITIVE_CHECK_ID = "06_false_positive_resistance"
FALSE_POSITIVE_ADVERSARIAL_ATTEMPTS = 5
ADVERSARIAL_MODEL = "anthropic/claude-opus-4.8"
ADVERSARIAL_REASONING_EFFORT = "high"

SKIPPED_DIR_NAMES = {
    ".frontiercode-cache",
    ".git",
    ".hg",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".svn",
    ".tox",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "venv",
}

SELECTED_REPO_FILE_NAMES = {
    ".clang-format",
    ".editorconfig",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
    "AGENTS.md",
    "BUILD",
    "Cargo.toml",
    "CMakeLists.txt",
    "CONTRIBUTING",
    "CONTRIBUTING.md",
    "Dockerfile",
    "Makefile",
    "Pipfile",
    "README",
    "README.md",
    "build.gradle",
    "go.mod",
    "gradle.properties",
    "jest.config.js",
    "makefile",
    "package.json",
    "pom.xml",
    "pyproject.toml",
    "pytest.ini",
    "requirements.txt",
    "setup.cfg",
    "setup.py",
    "tox.ini",
    "tsconfig.json",
}

SELECTED_REPO_SUFFIXES = {
    ".bazel",
    ".cmake",
    ".json",
    ".md",
    ".sh",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}


@dataclass(frozen=True)
class QACheck:
    id: str
    title: str
    qa_requirement: str
    reviewer_focus: tuple[str, ...]


QACHECKS: tuple[QACheck, ...] = (
    QACheck(
        id="01_prompt_clarity",
        title="Prompt Clarity",
        qa_requirement=(
            "Prompt is clear, humanlike, and concise, without over-specifying "
            "the implementation."
        ),
        reviewer_focus=(
            "Review instruction.md against the public task surface in environment/repo.",
            "The prompt should state the user-facing request and required constraints.",
            "It should avoid prescribing an exact patch strategy unless a maintainer request would do so.",
        ),
    ),
    QACheck(
        id="02_visible_workflow",
        title="Visible Workflow Guidance",
        qa_requirement=(
            "Visible testing, lint, build, and style guidance matches the repo's "
            "real maintainer workflow."
        ),
        reviewer_focus=(
            "Compare instruction.md commands with README, CONTRIBUTING, AGENTS, build files, Makefiles, package scripts, and visible tests.",
            "Flag generic or unsupported commands.",
            "Check whether visible guidance gives the agent enough information to validate changes without exposing hidden grader assets.",
        ),
    ),
    QACheck(
        id="03_rubric_coverage",
        title="Rubric Coverage",
        qa_requirement=(
            "Rubric covers mergeability, not just correctness: behavior, regressions, "
            "mechanical cleanliness, tests, scope, and code quality."
        ),
        reviewer_focus=(
            "Inspect tests/grader/frontiercode.yaml.",
            "Objective checks should use classical, command, reverse_classical, or scope criteria when applicable.",
            "Subjective quality should use llm_prompt if it is needed.",
            "Hidden deterministic assets should live under tests/hidden.",
        ),
    ),
    QACheck(
        id="04_rubric_metadata",
        title="Rubric Rationale And Weights",
        qa_requirement=(
            "Each rubric item has a rationale, blocker/non-blocker status, and calibrated weight."
        ),
        reviewer_focus=(
            "Confirm every criterion has a meaningful description or prompt that explains why it matters.",
            "Check that blocker status looks intentional.",
            "Check whether criterion weights look calibrated relative to task risk and scope.",
            "Use the deterministic QA result as supporting evidence for structural manifest validity.",
        ),
    ),
    QACheck(
        id="05_blocker_validity",
        title="Blocker Validity",
        qa_requirement=(
            "Blockers represent true hard stops a maintainer would reject in review."
        ),
        reviewer_focus=(
            "Review every blocker: true criterion in tests/grader/frontiercode.yaml.",
            "Check whether blocker failures correspond to patches that should not be merged.",
            "Use calibration examples as evidence where available.",
        ),
    ),
    QACheck(
        id="06_false_positive_resistance",
        title="False Positive Resistance",
        qa_requirement=(
            "False-positive checks ensure wrong solutions cannot pass because of weak tests or rubric gaps."
        ),
        reviewer_focus=(
            "Look for plausible shortcuts or exploits that could pass the rubric without solving the task.",
            "Check that hack, low_quality, or negative calibrations cover those shortcuts.",
            "Flag weak hidden tests, overly narrow commands, missing scope rules, or rubric prompts that could be gamed.",
        ),
    ),
    QACheck(
        id="07_false_negative_resistance",
        title="False Negative Resistance",
        qa_requirement=(
            "False-negative checks ensure valid non-canonical solutions are not rejected for brittle details."
        ),
        reviewer_focus=(
            "Check alternative_valid calibrations in tests/grader/frontiercode.yaml.",
            "For open-ended tasks, decide whether more than one independent valid solution is needed.",
            "Flag overly prescriptive criteria that reject valid maintainable implementations.",
        ),
    ),
    QACheck(
        id="08_agent_tests",
        title="Agent Test Correctness",
        qa_requirement=(
            "Agent-written tests, when required, are checked for meaning, ideally by "
            "running them against the broken base and confirming they fail."
        ),
        reviewer_focus=(
            "Decide whether the task asks or implies that the agent should add tests.",
            "If so, look for reverse_classical or explicit command criteria that validate submitted tests against the base snapshot or equivalent hidden fixture, for example tests/hidden/base_repo/ when that fixture is present.",
            "In v1, reverse_classical requires explicit evaluated result evidence during task QA.",
        ),
    ),
    QACheck(
        id="09_scope_controls",
        title="Scope Controls",
        qa_requirement=(
            "Scope checks prevent unrelated rewrites, excessive diff size, and unnecessary file churn."
        ),
        reviewer_focus=(
            "Look for method: scope criteria using allowed_paths, denied_paths, max_files, and max_changed_lines.",
            "If no explicit scope criterion exists, decide whether command criteria or task shape still meaningfully constrain scope.",
            "Flag missing or brittle scope controls for patch-based tasks.",
        ),
    ),
    QACheck(
        id="10_hidden_asset_isolation",
        title="Hidden Asset Isolation",
        qa_requirement=(
            "Hidden grader assets, rubrics, reference material, and calibration patches do not leak to the agent."
        ),
        reviewer_focus=(
            "Inspect agent-visible files: instruction.md, task.toml, and environment/repo.",
            "They must not contain hidden tests, grading prompts, reference outputs, calibration patches, or rubric answers from tests/grader or tests/hidden.",
            "A top-level solution folder is forbidden.",
        ),
    ),
    QACheck(
        id="11_packaging_e2e",
        title="End To End Packaging",
        qa_requirement=(
            "End-to-end packaging is tested in a fresh environment, including tests/test.sh, "
            "Docker/image setup, dependency install, and expected output schema."
        ),
        reviewer_focus=(
            "Review task.toml, environment/Dockerfile or docker_image, tests/test.sh, and the deterministic QA result.",
            "Check whether the task can be run through Harbor or an equivalent fresh container.",
            "Expected FrontierCode result fields are pass/fail, score, reward, blocker failures, and per-criterion results.",
        ),
    ),
)


class JSONModelClient(Protocol):
    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        ...


class TaskQAError(RuntimeError):
    pass


@dataclass(frozen=True)
class QACheckResult:
    check_id: str
    title: str
    status: str
    passed: bool
    confidence: float
    summary: str
    findings: tuple[str, ...]
    evidence_paths: tuple[str, ...]
    recommended_fixes: tuple[str, ...]
    raw_response: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "title": self.title,
            "status": self.status,
            "passed": self.passed,
            "confidence": self.confidence,
            "summary": self.summary,
            "findings": list(self.findings),
            "evidence_paths": list(self.evidence_paths),
            "recommended_fixes": list(self.recommended_fixes),
            "raw_response": self.raw_response,
        }


@dataclass(frozen=True)
class TaskQAReviewReport:
    task_path: Path
    task_id: str
    passed: bool
    check_results: tuple[QACheckResult, ...]
    deterministic_errors: tuple[str, ...]
    deterministic_warnings: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_path": str(self.task_path),
            "task_id": self.task_id,
            "passed": self.passed,
            "deterministic_errors": list(self.deterministic_errors),
            "deterministic_warnings": list(self.deterministic_warnings),
            "check_results": [item.to_dict() for item in self.check_results],
        }


class InferenceJSONClient:
    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: int = 180,
        reasoning_effort: str | None = None,
    ) -> None:
        self.model = model or os.environ.get("MODEL", DEFAULT_MODEL)
        self.base_url = normalize_base_url(
            base_url or os.environ.get("QA_BASE_URL") or DEFAULT_BASE_URL
        )
        self.api_key = api_key or os.environ.get("QA_API_KEY")
        self.timeout_seconds = timeout_seconds
        self.reasoning_effort = reasoning_effort

    def complete_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not self.api_key:
            raise TaskQAError("QA_API_KEY is required to run task QA")
        payload = build_inference_payload(
            model=self.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            feature="task-qa",
            reasoning_effort=self.reasoning_effort,
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
            raise TaskQAError(f"Task QA model request failed: {format_http_error(exc)}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise TaskQAError(f"Task QA model request failed: {exc}") from exc
        try:
            content = extract_inference_content(response_data)
        except ValueError as exc:
            raise TaskQAError(str(exc)) from exc
        return _parse_json_object(content)


def run_qa_dataset(
    path: Path,
    *,
    client: JSONModelClient,
    adversarial_client: JSONModelClient | None = None,
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    progress_stream: TextIO | None = None,
    progress_detail: bool = False,
    false_positive_output_dir: Path | None = None,
) -> list[TaskQAReviewReport]:
    return [
        run_qa(
            task_path,
            client=client,
            adversarial_client=adversarial_client,
            max_file_bytes=max_file_bytes,
            max_context_chars=max_context_chars,
            progress_stream=progress_stream,
            progress_detail=progress_detail,
            false_positive_output_dir=false_positive_output_dir,
        )
        for task_path in discover_task_paths(path)
    ]


def run_qa(
    task_path: Path,
    *,
    client: JSONModelClient,
    adversarial_client: JSONModelClient | None = None,
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    progress_stream: TextIO | None = None,
    progress_detail: bool = False,
    false_positive_output_dir: Path | None = None,
) -> TaskQAReviewReport:
    deterministic_report = qa_task(task_path)
    task_id = deterministic_report.task_id
    context = build_task_review_context(
        task_path,
        deterministic_report=deterministic_report.to_dict(),
        max_file_bytes=max_file_bytes,
        max_context_chars=max_context_chars,
    )

    check_results = []
    progress = QAProgress(progress_stream, show_details=progress_detail)
    total_checks = len(QACHECKS)
    progress.start_task(task_id, total_checks)
    for index, check in enumerate(QACHECKS, start=1):
        system_prompt, user_prompt = build_check_prompt(check, context)
        progress.start_check(task_id, index, total_checks, check)
        try:
            raw_response = _complete_json_with_progress(
                client,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                progress=progress,
            )
            result = normalize_check_result(check, raw_response)
            if check.id == FALSE_POSITIVE_CHECK_ID:
                adversarial_result = run_adversarial_false_positive_probe(
                    task_path,
                    check=check,
                    client=adversarial_client or client,
                    deterministic_report=deterministic_report.to_dict(),
                    attempts=FALSE_POSITIVE_ADVERSARIAL_ATTEMPTS,
                    max_file_bytes=max_file_bytes,
                    max_context_chars=max_context_chars,
                    output_dir=false_positive_output_dir,
                    progress=progress,
                )
                result = _merge_false_positive_results(result, adversarial_result)
        except Exception as exc:  # noqa: BLE001 - keep per-check failures isolated.
            result = _model_error_result(check, exc)
        check_results.append(result)
        progress.finish_check(task_id, index, total_checks, check, result)

    passed = deterministic_report.passed and all(item.passed for item in check_results)
    progress.finish_task(task_id, passed)
    return TaskQAReviewReport(
        task_path=task_path,
        task_id=task_id,
        passed=passed,
        check_results=tuple(check_results),
        deterministic_errors=deterministic_report.errors,
        deterministic_warnings=deterministic_report.warnings,
    )


def _model_error_result(check: QACheck, exc: Exception) -> QACheckResult:
    return QACheckResult(
        check_id=check.id,
        title=check.title,
        status="fail",
        passed=False,
        confidence=0.0,
        summary=f"Model call failed for {check.id}: {exc}",
        findings=(str(exc),),
        evidence_paths=(),
        recommended_fixes=("Fix the model client configuration and rerun this check.",),
        raw_response={"error": str(exc)},
    )


def build_check_prompt(check: QACheck, context: str) -> tuple[str, str]:
    system_prompt = (
        "You are a strict but fair FrontierCode task QA reviewer. "
        "Review only the provided local task artifacts. Do not invent files, "
        "commands, tests, or benchmark facts that are not in the context. "
        "Hidden grader files are reviewer-visible and agent-hidden. "
        "Return only a JSON object."
    )
    user_prompt = f"""
Prompt version: {PROMPT_VERSION}

Review exactly one QA check for this FrontierCode Harbor task.

Check id: {check.id}
Check title: {check.title}
QA requirement: {check.qa_requirement}

Reviewer focus:
{_bullet_lines(check.reviewer_focus)}

Return only JSON with this schema:
{{
  "status": "pass" | "warn" | "fail",
  "passed": true | false,
  "confidence": 0.0,
  "summary": "one or two sentences",
  "findings": [
    {{
      "severity": "info" | "warn" | "fail",
      "path": "relative/path or task root",
      "evidence": "short concrete evidence from the provided context",
      "reason": "why this matters"
    }}
  ],
  "evidence_paths": ["relative/path"],
  "recommended_fixes": ["specific fix, empty if none"]
}}

Status guidance:
- Use "pass" with passed=true only when the provided evidence is sufficient.
- Use "warn" with passed=true for non-blocking concerns or incomplete but acceptable evidence.
- Use "fail" with passed=false for blocking task QA issues.
- If the context is insufficient for this check, do not invent evidence; use warn or fail and explain what is missing.
- Keep findings concrete and path-based.

Task context:
{context}
""".strip()
    return system_prompt, user_prompt


def run_adversarial_false_positive_probe(
    task_path: Path,
    *,
    check: QACheck,
    client: JSONModelClient,
    deterministic_report: dict[str, Any],
    attempts: int = 1,
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
    output_dir: Path | None = None,
    progress: QAProgress | None = None,
) -> QACheckResult:
    attempts = max(1, attempts)
    try:
        manifest = load_manifest(task_path)
    except (ManifestError, FileNotFoundError, ValueError) as exc:
        return QACheckResult(
            check_id=check.id,
            title=check.title,
            status="fail",
            passed=False,
            confidence=0.0,
            summary=f"Could not load manifest for adversarial probing: {exc}",
            findings=(str(exc),),
            evidence_paths=(),
            recommended_fixes=("Fix the FrontierCode manifest and rerun adversarial QA.",),
            raw_response={"error": str(exc)},
        )

    context = build_adversarial_probe_context(
        task_path,
        deterministic_report=deterministic_report,
        max_file_bytes=max_file_bytes,
        max_context_chars=max_context_chars,
    )
    findings: list[str] = []
    evidence_paths: list[str] = []
    raw_attempts: list[dict[str, Any]] = []
    best_confidence = 0.0
    output_task_dir = None
    if output_dir is not None:
        output_task_dir = output_dir / _safe_artifact_segment(manifest.task_id or task_path.name)

    generated_attempts = _run_adversarial_model_attempts(
        client,
        manifest,
        context,
        attempts=attempts,
        progress=progress,
    )
    all_attempts_failed = True
    for probe_id, raw_response, error in generated_attempts:
        if error is not None:
            raw_attempt = {"probe_id": probe_id, "error": str(error)}
            raw_attempts.append(raw_attempt)
            findings.append(
                f"[warn] {probe_id} evidence: adversarial model call failed reason: {error}"
            )
            continue
        all_attempts_failed = False
        assert raw_response is not None
        confidence = _float_between_zero_and_one(raw_response.get("confidence", 0.0))
        best_confidence = max(best_confidence, confidence)
        patch_text = _extract_adversarial_patch(raw_response)
        raw_attempt: dict[str, Any] = dict(raw_response)
        raw_attempt["probe_id"] = probe_id
        raw_attempts.append(raw_attempt)
        if not patch_text:
            findings.append(
                f"[info] {probe_id} evidence: model did not return a patch reason: no adversarial candidate"
            )
            continue

        patch_path = _write_adversarial_patch(output_task_dir, probe_id, patch_text)
        if patch_path is not None:
            relative_patch_path = str(patch_path)
            evidence_paths.append(relative_patch_path)
            raw_attempt["patch_path"] = relative_patch_path
        raw_attempt["patch"] = patch_text

        result = evaluate_patch_text(
            task_path,
            manifest,
            patch_text,
            submission_id=probe_id,
            metadata={
                "calibration_type": "adversarial_generated",
                "strategy": str(raw_response.get("strategy", "")),
                "why_bad": str(raw_response.get("why_bad", raw_response.get("reason", ""))),
            },
        )
        raw_attempt["frontiercode_result"] = result.to_dict() if result is not None else None
        if result is None:
            findings.append(
                f"[warn] {probe_id} evidence: generated patch could not be evaluated reason: missing repo workdir"
            )
            continue

        blocker_summary = (
            "none" if result.passed else ", ".join(result.blocker_failures) or "unknown"
        )
        if result.passed and result.score >= manifest.low_quality_threshold:
            findings.append(
                f"[fail] {probe_id} evidence: passed blockers with score {result.score:.3f} "
                f"reason: bad patch is a false positive"
            )
            return QACheckResult(
                check_id=check.id,
                title=check.title,
                status="fail",
                passed=False,
                confidence=best_confidence,
                summary=(
                    f"Adversarial patch {probe_id} passed blockers and scored "
                    f"{result.score:.3f}, at or above low_quality_threshold "
                    f"{manifest.low_quality_threshold:.3f}."
                ),
                findings=tuple(findings),
                evidence_paths=tuple(evidence_paths),
                recommended_fixes=(
                    "Add this patch as a hack or negative calibration, then strengthen the command, hidden test, scope rule, or LLM prompt that allowed it.",
                ),
                raw_response={"attempts": raw_attempts},
            )

        findings.append(
            f"[info] {probe_id} evidence: blocker_failures={blocker_summary}; "
            f"score={result.score:.3f} reason: candidate did not clear the false-positive gate"
        )

    if all_attempts_failed and raw_attempts:
        return QACheckResult(
            check_id=check.id,
            title=check.title,
            status="fail",
            passed=False,
            confidence=0.0,
            summary=f"All {attempts} adversarial model attempts failed before returning a patch decision.",
            findings=tuple(findings),
            evidence_paths=tuple(evidence_paths),
            recommended_fixes=("Fix the adversarial model client configuration and rerun QA.",),
            raw_response={"attempts": raw_attempts},
        )

    if not raw_attempts:
        summary = "Adversarial probe did not run any attempts."
    elif any(_extract_adversarial_patch(raw) for raw in raw_attempts):
        summary = "Adversarial patches were generated, but none passed the false-positive gate."
    else:
        summary = "Adversarial agent did not find a candidate patch."
    return QACheckResult(
        check_id=check.id,
        title=check.title,
        status="pass",
        passed=True,
        confidence=best_confidence,
        summary=summary,
        findings=tuple(findings),
        evidence_paths=tuple(evidence_paths),
        recommended_fixes=(),
        raw_response={"attempts": raw_attempts},
    )


def _run_adversarial_model_attempts(
    client: JSONModelClient,
    manifest: Any,
    context: str,
    *,
    attempts: int,
    progress: QAProgress | None,
) -> list[tuple[str, dict[str, Any] | None, Exception | None]]:
    prompts = []
    for attempt in range(1, attempts + 1):
        probe_id = f"adversarial-{attempt}"
        prompts.append(
            (
                probe_id,
                build_adversarial_probe_prompt(
                    manifest,
                    context,
                    probe_id=probe_id,
                    attempt=attempt,
                    attempts=attempts,
                ),
            )
        )
    if attempts == 1:
        probe_id, (system_prompt, user_prompt) = prompts[0]
        try:
            raw_response = _complete_json_with_progress(
                client,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                progress=progress or QAProgress(None),
            )
        except Exception as exc:  # noqa: BLE001 - isolate optional probe failures.
            return [(probe_id, None, exc)]
        return [(probe_id, raw_response, None)]

    results: list[tuple[str, dict[str, Any] | None, Exception | None]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=attempts) as executor:
        future_to_probe = {
            executor.submit(
                client.complete_json,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            ): probe_id
            for probe_id, (system_prompt, user_prompt) in prompts
        }
        while future_to_probe:
            done, _ = concurrent.futures.wait(
                future_to_probe,
                timeout=0.12,
                return_when=concurrent.futures.FIRST_COMPLETED,
            )
            if not done:
                if progress is not None:
                    progress.tick()
                continue
            for future in done:
                probe_id = future_to_probe.pop(future)
                try:
                    results.append((probe_id, future.result(), None))
                except Exception as exc:  # noqa: BLE001 - keep attempts independent.
                    results.append((probe_id, None, exc))
    return sorted(results, key=lambda item: _probe_sort_key(item[0]))


def _probe_sort_key(probe_id: str) -> int:
    match = re.search(r"(\d+)$", probe_id)
    return int(match.group(1)) if match else 0


def _merge_false_positive_results(review: QACheckResult, adversarial: QACheckResult) -> QACheckResult:
    if not review.passed or not adversarial.passed:
        status = "fail"
        passed = False
    elif review.status == "warn" or adversarial.status == "warn":
        status = "warn"
        passed = True
    else:
        status = "pass"
        passed = True
    summary = _join_summary_parts(
        (
            review.summary,
            f"Adversarial probe: {adversarial.summary}",
        )
    )
    return QACheckResult(
        check_id=review.check_id,
        title=review.title,
        status=status,
        passed=passed,
        confidence=max(review.confidence, adversarial.confidence),
        summary=summary,
        findings=review.findings + adversarial.findings,
        evidence_paths=tuple(dict.fromkeys(review.evidence_paths + adversarial.evidence_paths)),
        recommended_fixes=tuple(dict.fromkeys(review.recommended_fixes + adversarial.recommended_fixes)),
        raw_response={
            "review": review.raw_response,
            "adversarial_probe": adversarial.raw_response,
        },
    )


def _join_summary_parts(parts: tuple[str, ...]) -> str:
    return " ".join(part.strip() for part in parts if part.strip())


def build_adversarial_probe_prompt(
    manifest: Any,
    context: str,
    *,
    probe_id: str,
    attempt: int,
    attempts: int,
) -> tuple[str, str]:
    system_prompt = (
        "You are a reviewer-side FrontierCode adversarial calibration agent. "
        "You are authorized to inspect hidden tests and grader files for this QA task. "
        "Your goal is to expose false positives by proposing a deliberately bad patch "
        "that passes the grader without genuinely satisfying the user request. "
        "Return only a JSON object."
    )
    user_prompt = f"""
Adversarial probe id: {probe_id}
Attempt: {attempt} of {attempts}

You may inspect all task files below, including `tests/grader/` and `tests/hidden/`.
The generated patch must modify only files under the repo workdir:
`{manifest.repo_workdir}`.

Produce a patch that tries to pass blockers while remaining a bad or shortcut
solution. Do not edit tests, hidden assets, grader files, task metadata, or
instructions. The diff will be applied from inside `{manifest.repo_workdir}`,
so diff --git paths must be repo-relative, such as `a/src/file.py`.

Return only JSON with this schema:
{{
  "status": "patch" | "no_candidate",
  "confidence": 0.0,
  "strategy": "short description of the exploit idea",
  "why_bad": "why this would not be an acceptable real solution",
  "patch": "unified git diff, empty when status is no_candidate"
}}

If no plausible exploit exists, return status "no_candidate" with an empty patch.

Task context:
{context}
""".strip()
    return system_prompt, user_prompt


def build_adversarial_probe_context(
    task_path: Path,
    *,
    deterministic_report: dict[str, Any],
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
) -> str:
    task_path = task_path.resolve()
    repo_workdir = "environment/repo"
    manifest_summary = ""
    manifest_path: Path | None = None
    try:
        manifest_path = find_manifest_path(task_path)
        manifest = load_manifest(task_path)
        repo_workdir = manifest.repo_workdir
        manifest_summary = _render_manifest_summary(manifest)
    except (ManifestError, FileNotFoundError, ValueError) as exc:
        manifest_summary = f"Manifest could not be loaded: {exc}"

    sections = [
        _section("Task Root", str(task_path)),
        _section(
            "Adversarial Access",
            "\n".join(
                [
                    "This reviewer-side probe may inspect all tests, including tests/hidden/.",
                    "Generated patches must only modify files under the repo workdir.",
                    "Tests, grader files, task metadata, and instructions are evidence only.",
                ]
            ),
        ),
        _section("Task File Tree", _render_file_tree(task_path, task_path, max_files=DEFAULT_MAX_TREE_FILES)),
    ]
    for relative in ("instruction.md", "task.toml", "tests/test.sh"):
        sections.append(_file_section(task_path, relative, max_file_bytes=max_file_bytes))
    if manifest_path is not None:
        sections.append(_file_section(task_path, manifest_path.relative_to(task_path), max_file_bytes=max_file_bytes))
    repo_path = task_path / repo_workdir
    sections.extend(
        [
            _section(
                "Repo Files Available For Patch",
                _render_all_files(
                    repo_path,
                    task_path,
                    max_file_bytes=max_file_bytes,
                    max_files=DEFAULT_ADVERSARIAL_MAX_REPO_FILES,
                ),
            ),
            _section(
                "All Tests And Hidden Grader Files",
                _render_all_files(
                    task_path / "tests",
                    task_path,
                    max_file_bytes=max_file_bytes,
                    max_files=DEFAULT_ADVERSARIAL_MAX_TEST_FILES,
                ),
            ),
            _section("Parsed Manifest Summary", manifest_summary),
            _section(
                "Existing Deterministic QA Result",
                json.dumps(deterministic_report, indent=2, sort_keys=True),
            ),
        ]
    )
    context = "\n\n".join(sections)
    if len(context) > max_context_chars:
        return (
            context[:max_context_chars]
            + "\n\n[Adversarial probe context truncated at "
            + str(max_context_chars)
            + " characters. Increase --max-context-chars for a fuller review.]"
        )
    return context


def normalize_check_result(check: QACheck, raw: dict[str, Any]) -> QACheckResult:
    status = str(raw.get("status", "")).strip().lower()
    if status not in {"pass", "warn", "fail"}:
        status = "pass" if bool(raw.get("passed", False)) else "fail"
    passed = bool(raw.get("passed", status != "fail"))
    if status == "fail":
        passed = False
    confidence = _float_between_zero_and_one(raw.get("confidence", 0.0))
    return QACheckResult(
        check_id=check.id,
        title=check.title,
        status=status,
        passed=passed,
        confidence=confidence,
        summary=str(raw.get("summary", "")).strip(),
        findings=tuple(_format_list_items(raw.get("findings", []))),
        evidence_paths=tuple(_string_list(raw.get("evidence_paths", []))),
        recommended_fixes=tuple(_string_list(raw.get("recommended_fixes", []))),
        raw_response=raw,
    )


def build_task_review_context(
    task_path: Path,
    *,
    deterministic_report: dict[str, Any],
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_context_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
) -> str:
    task_path = task_path.resolve()
    manifest_path: Path | None = None
    manifest_summary = ""
    repo_workdir = "environment/repo"
    try:
        manifest_path = find_manifest_path(task_path)
        manifest = load_manifest(task_path)
        repo_workdir = manifest.repo_workdir
        manifest_summary = _render_manifest_summary(manifest)
    except (ManifestError, FileNotFoundError, ValueError) as exc:
        manifest_summary = f"Manifest could not be loaded: {exc}"

    sections: list[str] = []
    sections.append(_section("Task Root", str(task_path)))
    sections.append(
        _section(
            "Expected FrontierCode Task Shape",
            "\n".join(
                [
                    "task.toml",
                    "instruction.md",
                    "environment/repo/",
                    "tests/test.sh",
                    "tests/grader/frontiercode.yaml",
                    "tests/hidden/",
                    "No top-level solution/ folder.",
                ]
            ),
        )
    )
    sections.append(
        _section(
            "Task File Tree",
            _render_file_tree(task_path, task_path, max_files=DEFAULT_MAX_TREE_FILES),
        )
    )

    for relative in ("instruction.md", "task.toml", "tests/test.sh"):
        sections.append(_file_section(task_path, relative, max_file_bytes=max_file_bytes))
    if manifest_path is not None:
        sections.append(_file_section(task_path, manifest_path.relative_to(task_path), max_file_bytes=max_file_bytes))

    repo_path = task_path / repo_workdir
    sections.append(
        _section(
            "Agent Visible Repo Tree",
            _render_file_tree(repo_path, task_path, max_files=DEFAULT_MAX_TREE_FILES),
        )
    )
    sections.append(
        _section(
            "Selected Agent Visible Repo Files",
            _render_selected_repo_files(repo_path, task_path, max_file_bytes=max_file_bytes),
        )
    )
    sections.append(
        _section(
            "Hidden Grader Asset Tree",
            "\n".join(
                [
                    _render_file_tree(task_path / "tests" / "grader", task_path, max_files=DEFAULT_MAX_TREE_FILES),
                    _render_file_tree(task_path / "tests" / "hidden", task_path, max_files=DEFAULT_MAX_TREE_FILES),
                ]
            ),
        )
    )
    sections.append(
        _section(
            "Selected Hidden Grader Files",
            _render_hidden_files(task_path, max_file_bytes=max_file_bytes),
        )
    )
    sections.append(_section("Parsed Manifest Summary", manifest_summary))
    sections.append(
        _section(
            "Existing Deterministic QA Result",
            json.dumps(deterministic_report, indent=2, sort_keys=True),
        )
    )

    context = "\n\n".join(sections)
    if len(context) > max_context_chars:
        return (
            context[:max_context_chars]
            + "\n\n[Task review context truncated at "
            + str(max_context_chars)
            + " characters. Increase --max-context-chars for a fuller review.]"
        )
    return context


def render_qa_markdown(reports: list[TaskQAReviewReport]) -> str:
    if not reports:
        return "# FrontierCode Task QA\n\nNo tasks found.\n"
    passed = sum(1 for item in reports if item.passed)
    check_counts = sorted({len(item.check_results) for item in reports})
    checks_label = str(check_counts[0]) if len(check_counts) == 1 else ", ".join(str(item) for item in check_counts)
    lines = [
        "# FrontierCode Task QA",
        "",
        f"- Tasks: {len(reports)}",
        f"- Passed: {passed}",
        f"- Failed: {len(reports) - passed}",
        f"- Checks per task: {checks_label}",
        "",
    ]
    for report in reports:
        lines.append(f"## {report.task_id}")
        lines.append("")
        lines.append(f"Status: {'PASS' if report.passed else 'FAIL'}")
        if report.deterministic_errors:
            lines.append("")
            lines.append("Deterministic QA errors:")
            for error in report.deterministic_errors:
                lines.append(f"- {error}")
        if report.deterministic_warnings:
            lines.append("")
            lines.append("Deterministic QA warnings:")
            for warning in report.deterministic_warnings:
                lines.append(f"- {warning}")
        lines.extend(
            [
                "",
                "| Check | Status | Confidence | Summary |",
                "| --- | --- | ---: | --- |",
            ]
        )
        for check in report.check_results:
            lines.append(
                "| "
                + " | ".join(
                    [
                        _md(f"{check.check_id} {check.title}"),
                        _md(check.status.upper()),
                        f"{check.confidence:.2f}",
                        _md(check.summary),
                    ]
                )
                + " |"
            )
        for check in report.check_results:
            if not check.findings and not check.recommended_fixes:
                continue
            lines.append("")
            lines.append(f"### {check.check_id} {check.title}")
            if check.findings:
                lines.append("")
                lines.append("Findings:")
                for finding in check.findings:
                    lines.append(f"- {finding}")
            if check.recommended_fixes:
                lines.append("")
                lines.append("Recommended fixes:")
                for fix in check.recommended_fixes:
                    lines.append(f"- {fix}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def render_qa_summary(reports: list[TaskQAReviewReport]) -> str:
    passed = sum(1 for item in reports if item.passed)
    lines = [
        f"Result: {'PASS' if passed == len(reports) else 'FAIL'}",
        f"Tasks: {len(reports)}",
        f"Passed: {passed}",
        f"Failed: {len(reports) - passed}",
    ]
    for report in reports:
        if report.passed:
            continue
        failed_checks = sum(1 for item in report.check_results if not item.passed)
        lines.append(f"- {report.task_id}: FAIL ({failed_checks} failing checks)")
    return "\n".join(lines).rstrip() + "\n"


def write_qa_report(output_dir: Path, reports: list[TaskQAReviewReport]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "qa.json").write_text(
        json.dumps([item.to_dict() for item in reports], indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (output_dir / "qa.md").write_text(
        render_qa_markdown(reports),
        encoding="utf-8",
    )


def add_qa_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--path", required=True, type=Path, help="Harbor task or dataset path.")
    parser.add_argument("--output", type=Path, help="Optional report output directory.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of Markdown.")
    parser.add_argument("--verbose", action="store_true", help="Print the full markdown QA report.")
    parser.add_argument(
        "--model",
        help=f"Inference model. Defaults to MODEL or {DEFAULT_MODEL}.",
    )
    parser.add_argument(
        "--base-url",
        help=(
            "Inference API base URL. Defaults to QA_BASE_URL or "
            "https://api.aqinference.com/v1."
        ),
    )
    parser.add_argument("--timeout-seconds", type=int, default=180, help="Per-check model request timeout.")
    parser.add_argument(
        "--max-file-bytes",
        type=int,
        default=DEFAULT_MAX_FILE_BYTES,
        help="Maximum bytes included per file in the model context.",
    )
    parser.add_argument(
        "--max-context-chars",
        type=int,
        default=DEFAULT_MAX_CONTEXT_CHARS,
        help="Maximum characters included in each check prompt.",
    )

def run_qa_from_args(args: argparse.Namespace) -> int:
    client = InferenceJSONClient(
        model=args.model,
        base_url=args.base_url,
        timeout_seconds=args.timeout_seconds,
    )
    adversarial_client = InferenceJSONClient(
        model=ADVERSARIAL_MODEL,
        base_url=args.base_url,
        timeout_seconds=args.timeout_seconds,
        reasoning_effort=ADVERSARIAL_REASONING_EFFORT,
    )
    reports = run_qa_dataset(
        args.path,
        client=client,
        adversarial_client=adversarial_client,
        max_file_bytes=args.max_file_bytes,
        max_context_chars=args.max_context_chars,
        progress_stream=sys.stderr,
        progress_detail=args.verbose,
        false_positive_output_dir=args.output / "false_positive_adversarial" if args.output else None,
    )
    if args.output:
        write_qa_report(args.output, reports)
    if args.json:
        print(json.dumps([item.to_dict() for item in reports], indent=2, sort_keys=True))
    elif args.verbose:
        print(render_qa_markdown(reports))
    else:
        print(render_qa_summary(reports))
    return 0 if all(report.passed for report in reports) else 1


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run_qa.py",
        description=(
            "Run the 11 README task QA checks, including adversarial false-positive probing."
        ),
    )
    add_qa_arguments(parser)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    return run_qa_from_args(args)


def _render_manifest_summary(manifest: Any) -> str:
    lines = [
        f"task_id: {manifest.task_id}",
        f"subset: {manifest.subset}",
        f"repo_workdir: {manifest.repo_workdir}",
        f"base_commit: {manifest.base_commit or ''}",
        f"low_quality_threshold: {manifest.low_quality_threshold}",
        "",
        "Criteria:",
    ]
    for criterion in manifest.criteria:
        lines.append(
            "- "
            + json.dumps(
                {
                    "id": criterion.id,
                    "category": criterion.category,
                    "method": criterion.method,
                    "blocker": criterion.blocker,
                    "weight": criterion.weight,
                    "threshold": criterion.threshold,
                    "command": criterion.command,
                    "has_prompt": bool(criterion.prompt),
                    "scope": {
                        "allowed_paths": list(criterion.allowed_paths),
                        "denied_paths": list(criterion.denied_paths),
                        "max_files": criterion.max_files,
                        "max_changed_lines": criterion.max_changed_lines,
                    },
                    "description": criterion.description,
                },
                sort_keys=True,
            )
        )
    lines.extend(["", "Calibrations:"])
    for calibration in manifest.calibrations:
        lines.append(
            "- "
            + json.dumps(
                {
                    "id": calibration.id,
                    "type": calibration.type,
                    "description": calibration.description,
                    "patch": calibration.patch,
                    "result_path": calibration.result_path,
                    "criteria_results": len(calibration.criteria_results),
                },
                sort_keys=True,
            )
        )
    return "\n".join(lines)


def _render_file_tree(root: Path, base: Path, *, max_files: int) -> str:
    if not root.exists():
        return f"[missing] {_safe_relative(root, base)}"
    if root.is_file():
        return str(_safe_relative(root, base))
    rows = []
    for item in sorted(root.rglob("*")):
        rel_to_root = item.relative_to(root)
        if _has_skipped_dir(rel_to_root):
            continue
        if item.is_file():
            rows.append(str(_safe_relative(item, base)))
        if len(rows) >= max_files:
            rows.append(f"[truncated after {max_files} files]")
            break
    return "\n".join(rows) if rows else "[no files found]"


def _render_selected_repo_files(repo_path: Path, task_path: Path, *, max_file_bytes: int) -> str:
    if not repo_path.exists():
        return f"[missing] {_safe_relative(repo_path, task_path)}"
    selected = []
    for path in sorted(repo_path.rglob("*")):
        if not path.is_file():
            continue
        rel_to_repo = path.relative_to(repo_path)
        if _has_skipped_dir(rel_to_repo):
            continue
        if _is_selected_repo_file(rel_to_repo):
            selected.append(path)
        if len(selected) >= 40:
            break
    if not selected:
        return "[no selected guidance, build, or visible test files found]"
    return "\n\n".join(
        _format_file_content(path, _safe_relative(path, task_path), max_file_bytes=max_file_bytes)
        for path in selected
    )


def _render_hidden_files(task_path: Path, *, max_file_bytes: int) -> str:
    roots = [task_path / "tests" / "grader", task_path / "tests" / "hidden"]
    selected = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            rel_to_root = path.relative_to(root)
            if _has_skipped_dir(rel_to_root):
                continue
            selected.append(path)
            if len(selected) >= 30:
                break
    if not selected:
        return "[no hidden grader files found]"
    return "\n\n".join(
        _format_file_content(path, _safe_relative(path, task_path), max_file_bytes=max_file_bytes)
        for path in selected
    )


def _render_all_files(root: Path, task_path: Path, *, max_file_bytes: int, max_files: int) -> str:
    if not root.exists():
        return f"[missing] {_safe_relative(root, task_path)}"
    if root.is_file():
        return _format_file_content(root, _safe_relative(root, task_path), max_file_bytes=max_file_bytes)
    selected = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel_to_root = path.relative_to(root)
        if _has_skipped_dir(rel_to_root):
            continue
        selected.append(path)
        if len(selected) >= max_files:
            break
    if not selected:
        return "[no files found]"
    rendered = [
        _format_file_content(path, _safe_relative(path, task_path), max_file_bytes=max_file_bytes)
        for path in selected
    ]
    if len(selected) >= max_files:
        rendered.append(f"[truncated after {max_files} files]")
    return "\n\n".join(rendered)


def _file_section(task_path: Path, relative: str | Path, *, max_file_bytes: int) -> str:
    path = task_path / relative
    return _section(
        f"File: {relative}",
        _format_file_content(path, Path(relative), max_file_bytes=max_file_bytes),
    )


def _format_file_content(path: Path, label: Path, *, max_file_bytes: int) -> str:
    if not path.exists():
        return f"### {label}\n[missing]"
    if path.is_dir():
        return f"### {label}\n[directory]"
    return f"### {label}\n```text\n{_read_text_limited(path, max_file_bytes=max_file_bytes)}\n```"


def _read_text_limited(path: Path, *, max_file_bytes: int) -> str:
    size = path.stat().st_size
    with path.open("rb") as file:
        data = file.read(max_file_bytes + 1)
    truncated = len(data) > max_file_bytes
    if truncated:
        data = data[:max_file_bytes]
    if b"\0" in data:
        return f"[binary content omitted; size={size} bytes]"
    text = data.decode("utf-8", errors="replace")
    if truncated:
        text += f"\n[truncated at {max_file_bytes} of {size} bytes]"
    return text


def _is_selected_repo_file(relative: Path) -> bool:
    parts = relative.parts
    if len(parts) > 4:
        return False
    name = relative.name
    lower_name = name.lower()
    if name in SELECTED_REPO_FILE_NAMES or lower_name.startswith(("readme", "contributing")):
        return True
    if len(parts) >= 2 and parts[0] in {"test", "tests"} and relative.suffix in SELECTED_REPO_SUFFIXES:
        return True
    if relative.suffix in {".cmake"}:
        return True
    return False


def _has_skipped_dir(relative: Path) -> bool:
    return any(part in SKIPPED_DIR_NAMES for part in relative.parts)


def _safe_relative(path: Path, base: Path) -> Path:
    try:
        return path.relative_to(base)
    except ValueError:
        return path


def _extract_adversarial_patch(raw: dict[str, Any]) -> str:
    for key in ("patch", "diff", "unified_diff"):
        value = raw.get(key)
        if isinstance(value, str):
            patch = _clean_patch_text(value)
            if patch:
                return patch
    return ""


def _clean_patch_text(value: str) -> str:
    text = value.strip()
    if not text:
        return ""
    fenced = re.search(r"```(?:diff|patch)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        text = fenced.group(1).strip()
    marker_indexes = [index for marker in ("diff --git ", "--- ") if (index := text.find(marker)) >= 0]
    if marker_indexes:
        first_marker = min(marker_indexes)
        if first_marker > 0:
            text = text[first_marker:].strip()
    return text


def _write_adversarial_patch(output_task_dir: Path | None, probe_id: str, patch_text: str) -> Path | None:
    if output_task_dir is None:
        return None
    output_task_dir.mkdir(parents=True, exist_ok=True)
    path = output_task_dir / f"{_safe_artifact_segment(probe_id)}.patch"
    path.write_text(patch_text.rstrip() + "\n", encoding="utf-8")
    return path


def _safe_artifact_segment(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "-", value.strip()).strip(".-")
    return safe or "task"


def _section(title: str, body: str) -> str:
    return f"## {title}\n{body}"


class QAProgress:
    _SPINNER = "|/-\\"

    def __init__(self, stream: TextIO | None, *, show_details: bool = False) -> None:
        self.stream = stream
        self.show_details = show_details
        self.interactive = bool(stream and getattr(stream, "isatty", lambda: False)())
        self.spinner_index = 0
        self.current_line = ""
        self.active: tuple[str, int, int, str] | None = None

    def start_task(self, task_id: str, total: int) -> None:
        if self.stream is None:
            return
        print(f"[qa] {task_id}: starting {total} checks", file=self.stream, flush=True)

    def start_check(self, task_id: str, index: int, total: int, check: QACheck) -> None:
        if self.stream is None:
            return
        if self.interactive:
            self.active = (task_id, index - 1, total, f"{check.id} {check.title}")
            self._render_active()

    def tick(self) -> None:
        if self.stream is None or not self.interactive or self.active is None:
            return
        self.spinner_index += 1
        self._render_active()

    def finish_check(
        self,
        task_id: str,
        index: int,
        total: int,
        check: QACheck,
        result: QACheckResult,
    ) -> None:
        if self.stream is None:
            return
        line = (
            f"[qa] {self._bar(index, total)} {index}/{total} {check.id} "
            f"{check.title}: {result.status.upper()} "
            f"(confidence {result.confidence:.2f})"
        )
        if self.show_details and result.status != "pass" and result.summary:
            line += f" - {_short_progress_text(result.summary)}"
        if self.interactive:
            self._clear_inline()
            self.active = None
        print(line, file=self.stream, flush=True)

    def finish_task(self, task_id: str, passed: bool) -> None:
        if self.stream is None:
            return
        if self.interactive:
            self._clear_inline()
        print(f"[qa] {task_id}: {'PASS' if passed else 'FAIL'}", file=self.stream, flush=True)

    def _render_active(self) -> None:
        assert self.active is not None
        task_id, completed, total, label = self.active
        spinner = self._SPINNER[self.spinner_index % len(self._SPINNER)]
        line = f"[qa] {spinner} {self._bar(completed, total)} {completed}/{total} {task_id}: {label}"
        self.current_line = self._truncate_to_terminal(line)
        self._write_inline(self.current_line)

    def _write_inline(self, line: str) -> None:
        assert self.stream is not None
        print(f"\r\033[K{line}", end="", file=self.stream, flush=True)

    def _clear_inline(self) -> None:
        assert self.stream is not None
        print("\r\033[K", end="", file=self.stream, flush=True)
        self.current_line = ""

    def _bar(self, completed: int, total: int) -> str:
        width = 24
        filled = 0 if total <= 0 else round(width * completed / total)
        return "[" + "#" * filled + "-" * (width - filled) + "]"

    def _truncate_to_terminal(self, line: str) -> str:
        columns = shutil.get_terminal_size((100, 20)).columns
        if len(line) <= columns - 1:
            return line
        return line[: max(0, columns - 4)].rstrip() + "..."


def _short_progress_text(text: str, *, max_chars: int = 240) -> str:
    compact = " ".join(text.split())
    if len(compact) > max_chars:
        return compact[:max_chars].rstrip() + "..."
    return compact


def _complete_json_with_progress(
    client: JSONModelClient,
    *,
    system_prompt: str,
    user_prompt: str,
    progress: QAProgress,
) -> dict[str, Any]:
    if progress.stream is None or not progress.interactive:
        return client.complete_json(system_prompt=system_prompt, user_prompt=user_prompt)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(
            client.complete_json,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
        while not future.done():
            progress.tick()
            time.sleep(0.12)
        return future.result()


def _bullet_lines(items: tuple[str, ...]) -> str:
    return "\n".join(f"- {item}" for item in items)


def _format_list_items(value: Any) -> list[str]:
    if not isinstance(value, list):
        return _string_list(value)
    formatted = []
    for item in value:
        if isinstance(item, dict):
            severity = str(item.get("severity", "")).strip()
            path = str(item.get("path", "")).strip()
            evidence = str(item.get("evidence", "")).strip()
            reason = str(item.get("reason", "")).strip()
            pieces = []
            if severity:
                pieces.append(f"[{severity}]")
            if path:
                pieces.append(path)
            if evidence:
                pieces.append(f"evidence: {evidence}")
            if reason:
                pieces.append(f"reason: {reason}")
            formatted.append(" ".join(pieces) if pieces else json.dumps(item, sort_keys=True))
        else:
            formatted.append(str(item))
    return formatted


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, tuple):
        return [str(item) for item in value]
    if isinstance(value, str):
        return [value] if value else []
    return [str(value)]


def _float_between_zero_and_one(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, parsed))


def _parse_json_object(content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise TaskQAError(f"Task QA model returned non-JSON content: {content[:200]}")
        parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise TaskQAError("Task QA JSON response must be an object")
    return parsed


def _md(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


if __name__ == "__main__":
    raise SystemExit(main())
