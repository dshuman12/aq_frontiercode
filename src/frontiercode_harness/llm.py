from __future__ import annotations

import hashlib
import json
import os
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
            "You are a strict FrontierCode rubric judge. Return only JSON "
            "with keys: passed (boolean), score (0 to 1), rationale (string)."
        ),
        user_prompt=f"Rubric:\n{prompt}\n\nDiff:\n{diff_text}",
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
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMJudgeError(f"LLM judge returned non-JSON content: {content[:200]}") from exc
    if not isinstance(parsed, dict):
        raise LLMJudgeError("LLM judge JSON response must be an object")
    return parsed


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
