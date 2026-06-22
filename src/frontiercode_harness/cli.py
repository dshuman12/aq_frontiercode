from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import sys
import threading
import uuid
from pathlib import Path
from typing import Any

from .harbor import load_frontiercode_results, run_harbor
from .qa import qa_dataset
from .reports import (
    render_qa_markdown,
    render_results_markdown,
    write_qa_report,
    write_results,
)
from .task_qa import add_qa_arguments, run_qa_from_args


_TRIAL_PROGRESS_POLL_SECONDS = 1.0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "qa":
        return run_qa_from_args(args)
    if args.command == "structure-qa":
        return _run_structure_qa(args)
    if args.command == "eval":
        return _run_eval(args)
    if args.command == "score":
        return _run_score(args)
    parser.print_help()
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="frontiercode-harness",
        description="Evaluate Harbor tasks using FrontierCode-style QA and scoring.",
    )
    subparsers = parser.add_subparsers(dest="command")

    qa = subparsers.add_parser(
        "qa",
        help="Run the 11 README task QA checks, including adversarial false-positive probing.",
    )
    add_qa_arguments(qa)

    structure_qa = subparsers.add_parser(
        "structure-qa",
        help="Run task structure and calibration QA gates only.",
    )
    structure_qa.add_argument("--path", required=True, type=Path, help="Harbor task or dataset path.")
    structure_qa.add_argument("--output", type=Path, help="Optional report output directory.")
    structure_qa.add_argument(
        "--enable-llm",
        action="store_true",
        help="Evaluate llm_prompt criteria for patch-based calibrations.",
    )

    eval_parser = subparsers.add_parser("eval", help="Run Harbor and score generated results.")
    eval_parser.add_argument("--path", required=True, type=Path, help="Harbor task or dataset path.")
    eval_parser.add_argument("--agent", required=True, help="Harbor agent name.")
    eval_parser.add_argument("--model", action="append", default=[], help="Agent model, repeatable.")
    eval_parser.add_argument(
        "--reasoning-effort",
        action="append",
        required=True,
        type=_nonempty_reasoning_effort,
        help="Reasoning effort to evaluate, repeatable.",
    )
    eval_parser.add_argument(
        "--trials",
        type=_positive_int,
        default=5,
        help="Independent trials per model/reasoning effort.",
    )
    eval_parser.add_argument(
        "--n-concurrent",
        type=_positive_int,
        help="Number of concurrent Harbor trials per model/reasoning-effort cell.",
    )
    eval_parser.add_argument("--jobs-dir", type=Path, default=Path("runs"), help="Harbor jobs directory.")
    eval_parser.add_argument("--harbor-bin", default="harbor", help="Harbor executable path.")
    eval_parser.add_argument("--include-task-name", action="append", default=[], help="Task filter, repeatable.")
    eval_parser.add_argument(
        "--artifact",
        action="append",
        default=["/logs/verifier/submission.patch"],
        help=(
            "Environment path to download as a Harbor artifact, repeatable. "
            "Defaults to the verifier-generated submission patch."
        ),
    )
    eval_parser.add_argument("--force-build", action="store_true", help="Pass --force-build to Harbor.")
    eval_parser.add_argument("--no-delete", action="store_true", help="Pass --no-delete to Harbor.")
    eval_parser.add_argument(
        "--timeout-seconds",
        type=_positive_int,
        help="Wall-clock timeout for each Harbor model/reasoning-effort cell.",
    )
    eval_parser.add_argument(
        "--retries",
        type=_nonnegative_int,
        default=0,
        help="Retry count for failed Harbor launches. Agent/verifier failures still count as trials.",
    )
    eval_parser.add_argument("--output", type=Path, help="Optional report output directory.")

    score = subparsers.add_parser("score", help="Score an existing Harbor job directory.")
    score.add_argument("--jobs-dir", required=True, type=Path, help="Harbor job directory.")
    score.add_argument("--output", type=Path, help="Optional report output directory.")
    score.add_argument("--json", action="store_true", help="Print JSON instead of Markdown.")

    return parser


def _nonempty_reasoning_effort(value: str) -> str:
    effort = value.strip()
    if not effort:
        raise argparse.ArgumentTypeError("reasoning effort must be non-empty")
    return effort


def _positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("value must be an integer") from exc
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be greater than zero")
    return parsed


def _nonnegative_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("value must be an integer") from exc
    if parsed < 0:
        raise argparse.ArgumentTypeError("value must be zero or greater")
    return parsed


def _run_structure_qa(args: argparse.Namespace) -> int:
    reports = qa_dataset(args.path, enable_llm=args.enable_llm)
    if args.output:
        write_qa_report(args.output, reports)
    print(render_qa_markdown(reports))
    return 0 if all(report.passed for report in reports) else 1


def _run_eval(args: argparse.Namespace) -> int:
    efforts = args.reasoning_effort
    if len(set(efforts)) != len(efforts):
        sys.stderr.write("duplicate --reasoning-effort values are not allowed\n")
        return 2
    models = args.model or [""]
    if len(set(models)) != len(models):
        sys.stderr.write("duplicate --model values are not allowed\n")
        return 2

    results = []
    run_manifest = _eval_manifest(args, models, efforts)
    output = args.output or args.jobs_dir / "frontiercode-report"
    for model in models:
        for effort in efforts:
            cell_jobs_dir = _cell_jobs_dir(args.jobs_dir, model, effort)
            result, attempts, job_dir = _run_harbor_with_retries(
                args=args,
                model=model,
                effort=effort,
                jobs_dir=cell_jobs_dir,
            )
            cell = {
                "model": model or "harbor-default",
                "reasoning_effort": effort,
                "jobs_dir": str(job_dir),
                "attempts": attempts,
                "returncode": result.returncode,
            }
            run_manifest["cells"].append(cell)
            sys.stderr.write(result.stderr)
            if result.returncode != 0:
                run_manifest["status"] = "failed"
                _write_eval_manifest(output, run_manifest)
                return result.returncode
            # Score only this invocation's own Harbor job dir so concurrent eval
            # runs sharing the cell directory can never bleed into each other.
            cell_results = load_frontiercode_results(job_dir)
            cell["result_count"] = len(cell_results)
            results.extend(cell_results)
    if not results:
        run_manifest["status"] = "no_results"
        _write_eval_manifest(output, run_manifest)
        sys.stderr.write("no FrontierCode results found in Harbor jobs directory\n")
        return 1
    run_manifest["status"] = "completed"
    run_manifest["result_count"] = len(results)
    output = args.output or args.jobs_dir / "frontiercode-report"
    write_results(output, results, run_manifest=run_manifest)
    passed = sum(1 for result in results if result.passed)
    pass_rate = passed / len(results)
    average_score = sum(
        float(getattr(result, "score", 0.0) or 0.0) for result in results
    ) / len(results)
    print(f"Passing trials: {passed}/{len(results)}")
    print(f"Pass rate: {pass_rate:.3f}")
    print(f"Average score: {average_score:.3f}")
    for line in _run_error_summary_lines(results):
        print(line)
    print(f"Results written to: {output}")
    return 0


def _run_score(args: argparse.Namespace) -> int:
    results = load_frontiercode_results(args.jobs_dir)
    if args.output:
        write_results(args.output, results)
    if args.json:
        print(json.dumps([item.to_dict() for item in results], indent=2, sort_keys=True))
    else:
        print(render_results_markdown(results))
    return 0 if results else 1


def _run_error_summary_lines(results: list) -> list[str]:
    errored = []
    for result in results:
        metadata = getattr(result, "metadata", {}) or {}
        if metadata.get("exception_type") or metadata.get("exception_message"):
            errored.append(metadata)
    if not errored:
        return []

    counts: dict[str, int] = {}
    examples: dict[str, str] = {}
    for metadata in errored:
        exception_type = str(metadata.get("exception_type") or "run_error")
        counts[exception_type] = counts.get(exception_type, 0) + 1
        examples.setdefault(exception_type, _first_line(str(metadata.get("exception_message") or "")))

    lines = [f"Errored trials: {len(errored)}/{len(results)}"]
    for exception_type in sorted(counts):
        line = f"- {exception_type}: {counts[exception_type]}"
        example = examples.get(exception_type)
        if example:
            line += f" ({example})"
        lines.append(line)
    return lines


def _first_line(value: str) -> str:
    for line in value.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def _slug(value: str) -> str:
    chars = [char.lower() if char.isalnum() else "-" for char in value]
    slug = "".join(chars).strip("-")
    return slug or "unknown"


def _cell_jobs_dir(jobs_dir: Path, model: str, effort: str) -> Path:
    model_slug = _slug(model) if model else "harbor-default"
    return jobs_dir / f"model-{model_slug}" / f"reasoning-{_slug(effort)}"


def _unique_job_name() -> str:
    """Collision-free Harbor job name unique to a single eval invocation.

    Keeps the human-readable timestamp Harbor uses by default, then appends a
    random suffix so two runs launched in the same second (or sharing a cell
    directory) never land in the same job dir.
    """
    return datetime.now().strftime("%Y-%m-%d__%H-%M-%S") + "__" + uuid.uuid4().hex[:8]


def _run_harbor_with_retries(
    *,
    args: argparse.Namespace,
    model: str,
    effort: str,
    jobs_dir: Path,
):
    attempts = 0
    total_attempts = args.retries + 1
    completed_trials = 0
    job_dir = jobs_dir
    while True:
        attempts += 1
        # Each attempt gets a unique Harbor job name so its trials land in a
        # directory we own exclusively. This is what prevents the live counter
        # and final scoring from picking up trials produced by a concurrent run.
        job_name = _unique_job_name()
        job_dir = jobs_dir / job_name
        result, completed_trials = _run_harbor_attempt_with_progress(
            args=args,
            model=model,
            effort=effort,
            job_name=job_name,
            job_dir=job_dir,
            completed_trials=completed_trials,
        )
        if result.returncode == 0 or attempts >= total_attempts:
            return result, attempts, job_dir
        sys.stderr.write(result.stderr)
        sys.stderr.write(
            "retrying Harbor launch "
            f"for model={model or 'harbor-default'} "
            f"reasoning_effort={effort} "
            f"after attempt {attempts}/{total_attempts}\n"
        )


def _run_harbor_attempt_with_progress(
    *,
    args: argparse.Namespace,
    model: str,
    effort: str,
    job_name: str,
    job_dir: Path,
    completed_trials: int,
):
    holder: dict[str, Any] = {}
    seen_job_dirs: set[Path] = set()

    def run() -> None:
        try:
            holder["result"] = run_harbor(
                task_path=args.path,
                agent=args.agent,
                models=[model] if model else [],
                trials=args.trials,
                reasoning_effort=effort,
                jobs_dir=job_dir.parent,
                harbor_bin=args.harbor_bin,
                include_task_names=args.include_task_name,
                force_build=args.force_build,
                no_delete=args.no_delete,
                artifact_paths=args.artifact,
                timeout_seconds=args.timeout_seconds,
                n_concurrent=args.n_concurrent,
                job_name=job_name,
            )
        except BaseException as exc:
            holder["exception"] = exc

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    while thread.is_alive():
        thread.join(_TRIAL_PROGRESS_POLL_SECONDS)
        completed_trials = _report_new_trial_completions(
            job_dir=job_dir,
            seen_job_dirs=seen_job_dirs,
            completed_trials=completed_trials,
            model=model,
            effort=effort,
        )
    completed_trials = _report_new_trial_completions(
        job_dir=job_dir,
        seen_job_dirs=seen_job_dirs,
        completed_trials=completed_trials,
        model=model,
        effort=effort,
    )
    if "exception" in holder:
        raise holder["exception"]
    return holder["result"], completed_trials


def _report_new_trial_completions(
    *,
    job_dir: Path,
    seen_job_dirs: set[Path],
    completed_trials: int,
    model: str,
    effort: str,
) -> int:
    for trial_dir in sorted(_job_result_dirs(job_dir) - seen_job_dirs):
        snapshot = _trial_progress_snapshot(trial_dir)
        if snapshot is None:
            continue
        seen_job_dirs.add(trial_dir)
        completed_trials += 1
        print(
            _format_trial_progress_line(
                snapshot=snapshot,
                completed_trials=completed_trials,
                model=model,
                effort=effort,
            ),
            flush=True,
        )
    return completed_trials


def _trial_progress_snapshot(trial_dir: Path) -> dict[str, Any] | None:
    for path in sorted(trial_dir.rglob("frontiercode_result.json")):
        data = _read_progress_json(path)
        if data is not None:
            snapshot = _frontiercode_progress_snapshot(data, trial_dir)
            if snapshot is not None:
                return snapshot

    result_data = _read_progress_json(trial_dir / "result.json")
    if result_data is not None:
        snapshot = _harbor_progress_snapshot(result_data, trial_dir)
        if snapshot is not None:
            return snapshot

    for path in sorted(trial_dir.rglob("reward.json")):
        data = _read_progress_json(path)
        if data is not None:
            snapshot = _reward_progress_snapshot(data, trial_dir)
            if snapshot is not None:
                return snapshot
    return None


def _frontiercode_progress_snapshot(
    data: dict[str, Any],
    trial_dir: Path,
) -> dict[str, Any] | None:
    if "score" not in data and "pass" not in data and "passed" not in data:
        return None
    score = _frontiercode_progress_score(data)
    return {
        "task_id": str(data.get("task_id") or trial_dir.parent.name or "unknown"),
        "submission_id": str(data.get("submission_id") or trial_dir.name),
        "passed": bool(data.get("pass", data.get("passed", score > 0))),
        "score": score,
        "exception_type": "",
    }


def _frontiercode_progress_score(data: dict[str, Any]) -> float:
    fallback = _progress_float(data.get("score", 0.0))
    criteria = data.get("criteria_results")
    if not isinstance(criteria, list):
        return fallback

    score_total = 0.0
    weighted_score = 0.0
    for item in criteria:
        if not isinstance(item, dict):
            continue
        weight = max(_progress_float(item.get("weight", 1.0), default=1.0), 0.0)
        score = _clamp_progress_score(
            _progress_float(item.get("score", 1.0 if item.get("passed") else 0.0))
        )
        score_total += weight
        weighted_score += score * weight
    if score_total <= 0:
        return fallback
    return weighted_score / score_total


def _harbor_progress_snapshot(
    data: dict[str, Any],
    trial_dir: Path,
) -> dict[str, Any] | None:
    config = data.get("config")
    if "trial_name" not in data or not isinstance(config, dict):
        return None
    exception = data.get("exception_info")
    exception_type = ""
    score = _harbor_progress_reward(data)
    passed = score > 0
    if isinstance(exception, dict):
        exception_type = str(exception.get("exception_type") or "harbor_exception")
        score = 0.0
        passed = False
    return {
        "task_id": str(data.get("task_name") or _progress_task_id_from_config(config, trial_dir)),
        "submission_id": str(data.get("trial_name") or config.get("trial_name") or trial_dir.name),
        "passed": passed,
        "score": score,
        "exception_type": exception_type,
    }


def _reward_progress_snapshot(
    data: dict[str, Any],
    trial_dir: Path,
) -> dict[str, Any] | None:
    if "reward" not in data:
        return None
    score = _progress_float(data.get("reward", 0.0))
    return {
        "task_id": str(data.get("task_name") or trial_dir.parent.name or "unknown"),
        "submission_id": trial_dir.name,
        "passed": score > 0,
        "score": score,
        "exception_type": "",
    }


def _format_trial_progress_line(
    *,
    snapshot: dict[str, Any],
    completed_trials: int,
    model: str,
    effort: str,
) -> str:
    status = "PASS" if snapshot["passed"] else "FAIL"
    line = (
        f"Trial finished {completed_trials}: "
        f"{snapshot['task_id']}/{snapshot['submission_id']} "
        f"model={model or 'harbor-default'} "
        f"reasoning_effort={effort} "
        f"{status} score={snapshot['score']:.3f}"
    )
    if snapshot["exception_type"]:
        line += f" error={snapshot['exception_type']}"
    return line


def _read_progress_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _harbor_progress_reward(data: dict[str, Any]) -> float:
    verifier_result = data.get("verifier_result")
    if not isinstance(verifier_result, dict):
        return 0.0
    rewards = verifier_result.get("rewards")
    if not isinstance(rewards, dict):
        return 0.0
    return _progress_float(rewards.get("reward", 0.0))


def _progress_task_id_from_config(config: dict[str, Any], trial_dir: Path) -> str:
    task = config.get("task")
    if isinstance(task, dict) and task.get("path"):
        return Path(str(task["path"])).name
    return trial_dir.parent.name or "unknown"


def _progress_float(value: Any, *, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp_progress_score(value: float) -> float:
    return max(0.0, min(1.0, value))


def _eval_manifest(
    args: argparse.Namespace,
    models: list[str],
    efforts: list[str],
) -> dict:
    return {
        "protocol": "frontiercode-eval-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "task_path": str(args.path),
        "agent": args.agent,
        "models": [model or "harbor-default" for model in models],
        "reasoning_efforts": efforts,
        "trials_per_cell": args.trials,
        "n_concurrent": args.n_concurrent,
        "timeout_seconds": args.timeout_seconds,
        "retries": args.retries,
        "harbor": {
            "bin": args.harbor_bin,
            "jobs_dir": str(args.jobs_dir),
            "force_build": args.force_build,
            "no_delete": args.no_delete,
            "include_task_names": args.include_task_name,
            "artifact_paths": args.artifact,
        },
        "metrics": {
            "trial_pass": "true iff all blocker criteria pass",
            "trial_score": "weighted average of criterion scores, including failed trials",
            "effort_score": "mean trial_score for a task/model/reasoning-effort cell",
            "effort_pass_rate": "mean trial_pass for a task/model/reasoning-effort cell",
            "final_score": "best effort_score over evaluated reasoning efforts",
            "final_pass_rate": "pass rate from the selected best-score reasoning effort",
        },
        "cells": [],
    }


def _write_eval_manifest(output_dir: Path, manifest: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "eval_manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def _job_result_dirs(jobs_dir: Path) -> set[Path]:
    if not jobs_dir.is_dir():
        return set()
    dirs = {
        path.parent
        for path in jobs_dir.rglob("result.json")
        if path.is_file() and _is_trial_result_path(path)
    }
    for artifact_name in ("frontiercode_result.json", "reward.json"):
        for path in jobs_dir.rglob(artifact_name):
            trial_dir = _artifact_trial_dir(path, jobs_dir)
            if trial_dir is not None:
                dirs.add(trial_dir)
    return dirs


def _is_trial_result_path(path: Path) -> bool:
    data = _read_progress_json(path)
    return data is not None and _harbor_progress_snapshot(data, path.parent) is not None


def _artifact_trial_dir(path: Path, jobs_dir: Path) -> Path | None:
    current = path.parent
    while current != jobs_dir:
        if (current / "config.json").is_file():
            return current
        if current.parent == current:
            break
        current = current.parent
    return None


if __name__ == "__main__":
    raise SystemExit(main())
