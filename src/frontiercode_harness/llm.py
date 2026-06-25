from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

from .models import Criterion, CriterionResult
from .inference import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    build_inference_payload,
    extract_inference_content,
    format_http_error,
    inference_headers,
    normalize_base_url,
)


class LLMJudgeError(RuntimeError):
    pass


def judge_diff(
    criterion: Criterion,
    diff_text: str,
    cache_dir: Path,
    *,
    task_id: str,
    submission_id: str,
    model: str | None = None,
) -> CriterionResult:
    cache_dir.mkdir(parents=True, exist_ok=True)
    judge_model = model or os.environ.get("MODEL", DEFAULT_MODEL)
    cache_key = _cache_key(task_id, submission_id, f"{judge_model}\0{criterion.id}", diff_text)
    cache_path = cache_dir / f"{cache_key}.json"
    if cache_path.exists():
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    else:
        data = _call_inference_judge(criterion, diff_text, model=judge_model)
        cache_path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    score = float(data.get("score", 0.0))
    passed = bool(data.get("passed", score >= criterion.threshold))
    return CriterionResult(
        criterion_id=criterion.id,
        passed=passed,
        score=max(0.0, min(1.0, score)),
        blocker=criterion.blocker,
        weight=criterion.weight,
        details=str(data.get("rationale", "")),
        method=criterion.method,
        category=criterion.category,
        evaluated=True,
    )


def _call_inference_judge(criterion: Criterion, diff_text: str, *, model: str | None = None) -> dict:
    api_key = os.environ.get("QA_API_KEY")
    base_url = normalize_base_url(os.environ.get("QA_BASE_URL", DEFAULT_BASE_URL))
    model = model or os.environ.get("MODEL", DEFAULT_MODEL)
    if not api_key:
        raise LLMJudgeError("QA_API_KEY is required for llm_prompt criteria")
    prompt = criterion.prompt or criterion.description
    payload = build_inference_payload(
        model=model,
        system_prompt=(
            "You are a strict FrontierCode rubric judge. You grade a code diff "
            "against one rubric item. Respond with ONLY a single JSON object and no "
            "other text, markdown, or code fences. The object must have exactly these "
            'keys: "passed" (boolean), "score" (number 0 to 1), "rationale" (string). '
            'Example: {"passed": true, "score": 0.8, "rationale": "..."}'
        ),
        user_prompt=(
            f"Rubric item:\n{prompt}\n\nDiff under review:\n{diff_text}\n\n"
            'Return ONLY the JSON object, e.g. {"passed": true, "score": 0.8, '
            '"rationale": "concise reason"}.'
        ),
        feature="rubric-judge",
    )
    request = urllib.request.Request(
        f"{base_url}/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers=inference_headers(api_key),
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise LLMJudgeError(f"LLM judge request failed: {format_http_error(exc)}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise LLMJudgeError(f"LLM judge request failed: {exc}") from exc
    try:
        content = extract_inference_content(response_data)
    except ValueError as exc:
        raise LLMJudgeError(str(exc)) from exc
    return _extract_judge_json(content)


def _extract_judge_json(content: str) -> dict:
    """Parse the judge response, tolerating prose/markdown around the JSON object."""
    candidates: list[str] = [content]
    fenced = re.search(r"```(?:json)?\s*(.*?)```", content, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        candidates.append(fenced.group(1))
    # Greedy {...} captures the outermost object even with trailing prose.
    brace = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if brace:
        candidates.append(brace.group(0))
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise LLMJudgeError(f"LLM judge returned non-JSON content: {content[:200]}")


def _cache_key(task_id: str, submission_id: str, criterion_id: str, diff_text: str) -> str:
    digest = hashlib.sha256()
    digest.update(task_id.encode())
    digest.update(b"\0")
    digest.update(submission_id.encode())
    digest.update(b"\0")
    digest.update(criterion_id.encode())
    digest.update(b"\0")
    digest.update(diff_text.encode())
    return digest.hexdigest()
