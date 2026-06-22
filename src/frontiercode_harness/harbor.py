from __future__ import annotations

from dataclasses import replace
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

from .models import CriterionResult, FrontierCodeResult
from .scoring import aggregate_criterion_results


EVAL_API_KEY_ENV = "EVAL_API_KEY"
EVAL_BASE_URL_ENV = "EVAL_BASE_URL"
HARBOR_API_KEY_ENV = "OPENAI_API_KEY"
HARBOR_BASE_URL_ENV = "OPENAI_BASE_URL"


def _harbor_subprocess_env() -> dict[str, str]:
    env = os.environ.copy()
    _replace_env(env, HARBOR_API_KEY_ENV, EVAL_API_KEY_ENV)
    _replace_env(env, HARBOR_BASE_URL_ENV, EVAL_BASE_URL_ENV)
    return env


def _replace_env(env: dict[str, str], target: str, source: str) -> None:
    value = env.get(source)
    if value is None:
        env.pop(target, None)
    else:
        env[target] = value


def run_harbor(
    *,
    task_path: Path,
    agent: str,
    models: list[str],
    trials: int,
    reasoning_effort: str,
    jobs_dir: Path,
    harbor_bin: str = "harbor",
    include_task_names: list[str] | None = None,
    force_build: bool = False,
    no_delete: bool = False,
    artifact_paths: list[str] | None = None,
    timeout_seconds: int | None = None,
    n_concurrent: int | None = None,
    job_name: str | None = None,
) -> subprocess.CompletedProcess[str]:
    command = [
        harbor_bin,
        "run",
        "--path",
        str(task_path),
        "--agent",
        agent,
        "--agent-kwarg",
        f"reasoning_effort={reasoning_effort}",
        "--n-attempts",
        str(trials),
        "--jobs-dir",
        str(jobs_dir),
    ]
    if job_name is not None:
        command.extend(["--job-name", job_name])
    if n_concurrent is not None:
        command.extend(["--n-concurrent", str(n_concurrent)])
    for model in models:
        command.extend(["--model", model])
    for task_name in include_task_names or []:
        command.extend(["--include-task-name", task_name])
    for artifact_path in artifact_paths or []:
        command.extend(["--artifact", artifact_path])
    command.append("--force-build" if force_build else "--no-force-build")
    if no_delete:
        command.append("--no-delete")
    try:
        return subprocess.run(
            command,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=timeout_seconds,
            env=_harbor_subprocess_env(),
        )
    except subprocess.TimeoutExpired as exc:
        stderr = _timeout_text(exc.stderr)
        if stderr:
            stderr += "\n"
        if timeout_seconds is None:
            stderr += "Harbor timed out"
        else:
            stderr += f"Harbor timed out after {timeout_seconds} seconds"
        return subprocess.CompletedProcess(
            args=command,
            returncode=124,
            stdout=_timeout_text(exc.stdout),
            stderr=stderr,
        )


def load_frontiercode_results(jobs_dir: Path) -> list[FrontierCodeResult]:
    frontiercode_paths = sorted(jobs_dir.rglob("frontiercode_result.json"))
    if frontiercode_paths:
        return _fill_missing_reasoning_efforts(
            [_load_frontiercode_result_file(path) for path in frontiercode_paths]
        )
    harbor_trial_results = _load_harbor_trial_results(jobs_dir)
    if harbor_trial_results:
        return _fill_missing_reasoning_efforts(harbor_trial_results)
    return _fill_missing_reasoning_efforts(_load_harbor_reward_results(jobs_dir))


def _load_frontiercode_result_file(path: Path) -> FrontierCodeResult:
    result = FrontierCodeResult.from_dict(json.loads(path.read_text(encoding="utf-8")))
    metadata = _trial_metadata(path)
    metadata["source"] = str(path)
    return replace(
        result,
        submission_id=result.submission_id or str(metadata.get("trial_id", "")),
        metadata={**metadata, **result.metadata},
    )


def _load_harbor_reward_results(jobs_dir: Path) -> list[FrontierCodeResult]:
    results = []
    for path in sorted(jobs_dir.rglob("reward.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        reward = float(data.get("reward", 0.0))
        passed = reward > 0
        metadata = _trial_metadata(path)
        metadata["source"] = str(path)
        task_id = str(data.get("task_name") or metadata.get("task_id") or _infer_task_id(path))
        criterion = CriterionResult(
            criterion_id="harbor_reward",
            passed=passed,
            score=reward,
            blocker=True,
            weight=1.0,
            details=str(data.get("message", "")),
            method="harbor_reward",
        )
        results.append(
            aggregate_criterion_results(
                task_id,
                submission_id=str(metadata.get("trial_id") or path.parent),
                criterion_results=(criterion,),
                metadata=metadata,
            )
        )
    return results


def _load_harbor_trial_results(jobs_dir: Path) -> list[FrontierCodeResult]:
    results = []
    for path in sorted(jobs_dir.rglob("result.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if not _is_trial_result(data):
            continue

        metadata = _trial_result_metadata(path, data)
        exception = data.get("exception_info")
        if isinstance(exception, dict):
            exception_type = str(exception.get("exception_type") or "harbor_exception")
            details = str(exception.get("exception_message") or "")
            criterion = CriterionResult(
                criterion_id=exception_type,
                passed=False,
                score=0.0,
                blocker=True,
                weight=1.0,
                details=details,
                method="harbor_exception",
            )
            results.append(
                aggregate_criterion_results(
                    _trial_result_task_id(data, metadata, path),
                    submission_id=str(metadata.get("trial_id") or path.parent.name),
                    criterion_results=(criterion,),
                    metadata=metadata,
                )
            )
            continue

        reward = _trial_result_reward(data)
        passed = reward > 0
        criterion = CriterionResult(
            criterion_id="harbor_reward",
            passed=passed,
            score=reward,
            blocker=True,
            weight=1.0,
            details="",
            method="harbor_reward",
        )
        results.append(
            aggregate_criterion_results(
                _trial_result_task_id(data, metadata, path),
                submission_id=str(metadata.get("trial_id") or path.parent.name),
                criterion_results=(criterion,),
                metadata=metadata,
            )
        )
    return results


def _is_trial_result(data: dict[str, Any]) -> bool:
    return "trial_name" in data and isinstance(data.get("config"), dict)


def _trial_result_metadata(path: Path, data: dict[str, Any]) -> dict[str, Any]:
    metadata = _trial_metadata(path)
    config = data.get("config")
    if isinstance(config, dict):
        metadata.update(_metadata_from_trial_config(config))
    trial_name = data.get("trial_name")
    if trial_name:
        metadata["trial_id"] = str(trial_name)
    metadata["source"] = str(path)

    agent_info = data.get("agent_info")
    if isinstance(agent_info, dict):
        if agent_info.get("name"):
            metadata.setdefault("agent", str(agent_info["name"]))
        model_info = agent_info.get("model_info")
        if isinstance(model_info, dict) and model_info.get("name"):
            provider = model_info.get("provider")
            model = str(model_info["name"])
            metadata.setdefault("model", f"{provider}/{model}" if provider else model)

    exception = data.get("exception_info")
    if isinstance(exception, dict):
        if exception.get("exception_type"):
            metadata["exception_type"] = str(exception["exception_type"])
        if exception.get("occurred_at"):
            metadata["exception_occurred_at"] = str(exception["occurred_at"])
    return metadata


def _trial_result_task_id(
    data: dict[str, Any],
    metadata: dict[str, Any],
    path: Path,
) -> str:
    return str(data.get("task_name") or metadata.get("task_id") or _infer_task_id(path))


def _trial_result_reward(data: dict[str, Any]) -> float:
    verifier_result = data.get("verifier_result")
    if not isinstance(verifier_result, dict):
        return 0.0
    rewards = verifier_result.get("rewards")
    if not isinstance(rewards, dict):
        return 0.0
    try:
        return float(rewards.get("reward", 0.0))
    except (TypeError, ValueError):
        return 0.0


def _fill_missing_reasoning_efforts(
    results: list[FrontierCodeResult],
) -> list[FrontierCodeResult]:
    known: dict[tuple[str, str, str, str], set[str]] = {}
    for result in results:
        effort = result.metadata.get("reasoning_effort")
        if not effort:
            continue
        known.setdefault(_effort_inference_key(result), set()).add(str(effort))

    filled = []
    for result in results:
        if result.metadata.get("reasoning_effort"):
            filled.append(result)
            continue
        efforts = known.get(_effort_inference_key(result), set())
        if len(efforts) != 1:
            filled.append(result)
            continue
        metadata = dict(result.metadata)
        metadata["reasoning_effort"] = next(iter(efforts))
        metadata["reasoning_effort_inferred"] = True
        filled.append(replace(result, metadata=metadata))
    return filled


def _effort_inference_key(result: FrontierCodeResult) -> tuple[str, str, str, str]:
    metadata = result.metadata
    return (
        result.task_id,
        str(metadata.get("agent", "")),
        str(metadata.get("model", "")),
        str(metadata.get("job_id") or metadata.get("trials_dir") or ""),
    )


def _trial_metadata(path: Path) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    trial_dir = _find_trial_dir(path)
    if trial_dir is not None:
        metadata["trial_dir"] = str(trial_dir)
        metadata["trial_id"] = trial_dir.name
        config = _read_json(trial_dir / "config.json")
        if config:
            metadata.update(_metadata_from_trial_config(config))
        if "reasoning_effort" not in metadata:
            effort = _reasoning_effort_from_trial_log(trial_dir / "trial.log")
            if effort:
                metadata["reasoning_effort"] = effort
        lock = _find_lock_path(trial_dir)
        if lock is not None:
            metadata.update(_metadata_from_lock(_read_json(lock), existing=metadata))
        metadata.update(_metadata_from_exception(_read_json(trial_dir / "result.json")))
    return metadata


def _find_trial_dir(path: Path) -> Path | None:
    for parent in path.parents:
        if (
            (parent / "config.json").exists()
            or (parent / "trial.log").exists()
            or (parent / "result.json").exists()
        ):
            return parent
    return None


def _find_lock_path(trial_dir: Path) -> Path | None:
    for parent in (trial_dir, *trial_dir.parents):
        lock = parent / "lock.json"
        if lock.exists():
            return lock
    return None


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _metadata_from_trial_config(config: dict[str, Any]) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    task = config.get("task")
    if isinstance(task, dict):
        task_name = task.get("name")
        task_path = task.get("path")
        if task_path:
            metadata["task_path"] = str(task_path)
        if task_name:
            metadata["task_id"] = str(task_name)
        elif task_path:
            metadata["task_id"] = Path(str(task_path)).name
    trial_name = config.get("trial_name")
    if trial_name:
        metadata["trial_id"] = str(trial_name)
    trials_dir = config.get("trials_dir")
    if trials_dir:
        metadata["trials_dir"] = str(trials_dir)
    job_id = config.get("job_id")
    if job_id:
        metadata["job_id"] = str(job_id)

    agent = config.get("agent")
    if isinstance(agent, dict):
        agent_name = agent.get("name")
        if agent_name:
            metadata["agent"] = str(agent_name)
        model_name = agent.get("model_name")
        if model_name:
            metadata["model"] = str(model_name)
        kwargs = agent.get("kwargs")
        if isinstance(kwargs, dict) and kwargs.get("reasoning_effort"):
            metadata["reasoning_effort"] = str(kwargs["reasoning_effort"])
    return metadata


def _metadata_from_lock(
    lock: dict[str, Any],
    *,
    existing: dict[str, Any],
) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    harbor = lock.get("harbor")
    if isinstance(harbor, dict) and harbor.get("version"):
        metadata["harbor_version"] = str(harbor["version"])
    created_at = lock.get("created_at")
    if created_at:
        metadata["job_created_at"] = str(created_at)

    trials = lock.get("trials")
    if not isinstance(trials, list):
        return metadata

    agents = _unique_trial_values(trials, ("agent", "name"))
    models = _unique_trial_values(trials, ("agent", "model_name"))
    efforts = _unique_trial_values(trials, ("agent", "kwargs", "reasoning_effort"))
    if "agent" not in existing and len(agents) == 1:
        metadata["agent"] = agents[0]
    if "model" not in existing and len(models) == 1:
        metadata["model"] = models[0]
    if "reasoning_effort" not in existing and len(efforts) == 1:
        metadata["reasoning_effort"] = efforts[0]
    return metadata


def _metadata_from_exception(result: dict[str, Any]) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    exception = result.get("exception_info")
    if not isinstance(exception, dict):
        return metadata
    for source_key, metadata_key in (
        ("exception_type", "exception_type"),
        ("exception_message", "exception_message"),
        ("exception_traceback", "exception_traceback"),
        ("occurred_at", "exception_occurred_at"),
    ):
        value = exception.get(source_key)
        if value:
            metadata[metadata_key] = str(value)
    return metadata


def _unique_trial_values(trials: list[Any], keys: tuple[str, ...]) -> list[str]:
    values = set()
    for trial in trials:
        value: Any = trial
        for key in keys:
            if not isinstance(value, dict):
                value = None
                break
            value = value.get(key)
        if value:
            values.add(str(value))
    return sorted(values)


def _reasoning_effort_from_trial_log(path: Path) -> str | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        return None
    match = re.search(r"model_reasoning_effort=([A-Za-z0-9_.-]+)", text)
    return match.group(1) if match else None


def _infer_task_id(path: Path) -> str:
    for parent in path.parents:
        if parent.name.startswith("trial-"):
            continue
        if parent.name not in {"verifier", "agent", "environment"}:
            return parent.name.split("__", 1)[0]
    return path.parent.name


def _timeout_text(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value
