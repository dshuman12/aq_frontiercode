from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from .models import FrontierCodeResult, TaskQAReport


def write_results(
    output_dir: Path,
    results: list[FrontierCodeResult],
    run_manifest: dict[str, Any] | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "frontiercode_results.json").write_text(
        json.dumps([item.to_dict() for item in results], indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (output_dir / "frontiercode_summary.json").write_text(
        json.dumps(summarize_final_results(results), indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (output_dir / "frontiercode_effort_summary.json").write_text(
        json.dumps(summarize_results(results), indent=2, sort_keys=True),
        encoding="utf-8",
    )
    if run_manifest is not None:
        (output_dir / "eval_manifest.json").write_text(
            json.dumps(run_manifest, indent=2, sort_keys=True),
            encoding="utf-8",
        )
    _write_final_csv(output_dir / "leaderboard.csv", results)
    _write_effort_csv(output_dir / "effort_summary.csv", results)
    (output_dir / "summary.md").write_text(render_results_markdown(results), encoding="utf-8")


def write_qa_report(output_dir: Path, reports: list[TaskQAReport]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "task_qa.json").write_text(
        json.dumps([item.to_dict() for item in reports], indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (output_dir / "task_qa.md").write_text(render_qa_markdown(reports), encoding="utf-8")


def render_results_markdown(results: list[FrontierCodeResult]) -> str:
    if not results:
        return "# FrontierCode Results\n\nNo results found.\n"
    effort_summaries = summarize_results(results)
    final_summaries = summarize_final_results(results)
    lines = [
        "# FrontierCode Results",
        "",
        (
            "Trial mode: each trial is one independent agent solve trajectory. "
            "The agent receives the task description plus repository guidelines, "
            "produces a patch/output, and grading happens afterward."
        ),
        "",
        f"- Trials: {len(results)}",
        f"- Effort groups: {len(effort_summaries)}",
        f"- Final groups: {len(final_summaries)}",
        "",
        "## Final Results",
        "",
        "| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for item in final_summaries:
        lines.append(
            "| "
            + " | ".join(
                [
                    _md(item["task_id"]),
                    _md(item["agent"]),
                    _md(item["model"]),
                    _md(item["best_reasoning_effort"]),
                    str(item["n_trials"]),
                    f"{item['final_pass_rate']:.3f}",
                    f"{item['final_score']:.3f}",
                    f"{item['final_mean_reward']:.3f}",
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## Effort Results",
            "",
            "| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |",
            "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )
    for item in effort_summaries:
        lines.append(
            "| "
            + " | ".join(
                [
                    _md(item["task_id"]),
                    _md(item["agent"]),
                    _md(item["model"]),
                    _md(item["reasoning_effort"]),
                    str(item["n_trials"]),
                    f"{item['pass_rate']:.3f}",
                    f"{item['average_score']:.3f}",
                    f"{item['mean_reward']:.3f}",
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## Trial Details",
            "",
            "| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |",
            "| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |",
        ]
    )
    for item in results:
        criteria_summary, category_summary = _criterion_summaries(item)
        lines.append(
            "| "
            + " | ".join(
                [
                    _md(item.task_id),
                    _md(str(item.metadata.get("agent", "unknown"))),
                    _md(str(item.metadata.get("model", "unknown"))),
                    _md(str(item.metadata.get("reasoning_effort", "unknown"))),
                    _md(item.submission_id),
                    "yes" if item.passed else "no",
                    _md(criteria_summary),
                    _md(category_summary),
                    f"{item.score:.3f}",
                    _md(", ".join(item.blocker_failures)),
                ]
            )
            + " |"
        )
    lines.extend(_render_grader_details(results))
    return "\n".join(lines) + "\n"


def _render_grader_details(results: list[FrontierCodeResult]) -> list[str]:
    lines = [
        "",
        "## Grader Details",
        "",
        (
            "Trial pass/fail is determined by blocker criteria. Trial score is "
            "the weighted average of criterion scores, including failed trials."
        ),
        "",
    ]
    for result in results:
        lines.extend(_render_trial_grader_detail(result))
    return lines


def _render_trial_grader_detail(result: FrontierCodeResult) -> list[str]:
    criteria_summary, category_summary = _criterion_summaries(result)
    summary = (
        f"{result.submission_id or 'unknown submission'}: "
        f"{'PASS' if result.passed else 'FAIL'}, score {result.score:.3f}, "
        f"criteria {criteria_summary}"
    )
    lines = [
        f"<details>",
        f"<summary>{_html(summary)}</summary>",
        "",
        f"- Task: `{_inline_code(result.task_id)}`",
        f"- Agent: `{_inline_code(str(result.metadata.get('agent', 'unknown')))}`",
        f"- Model: `{_inline_code(str(result.metadata.get('model', 'unknown')))}`",
        f"- Reasoning effort: `{_inline_code(str(result.metadata.get('reasoning_effort', 'unknown')))}`",
        f"- Pass: {'yes' if result.passed else 'no'}",
        f"- Score: {result.score:.3f}",
        f"- Reward: {result.reward:.3f}",
        f"- Criteria: {criteria_summary}",
        f"- Categories: {category_summary or 'none'}",
        f"- Blocker failures: {_format_blocker_failures(result)}",
        "",
    ]
    error_lines = _render_run_error(result)
    if error_lines:
        lines.extend(error_lines)
    if result.criteria_results:
        lines.extend(
            [
                "| Criterion | Category | Method | Blocker | Weight | Score | Pass |",
                "| --- | --- | --- | --- | ---: | ---: | --- |",
            ]
        )
        for criterion in result.criteria_results:
            lines.append(
                "| "
                + " | ".join(
                    [
                        _md(criterion.criterion_id),
                        _md(criterion.category),
                        _md(criterion.method or "unknown"),
                        "yes" if criterion.blocker else "no",
                        f"{criterion.weight:.3f}",
                        f"{criterion.score:.3f}",
                        "yes" if criterion.passed else "no",
                    ]
                )
                + " |"
            )
        detail_lines = _render_criterion_details(result)
        if detail_lines:
            lines.extend(["", "Criterion evidence:", ""])
            lines.extend(detail_lines)
    else:
        lines.append("No criterion-level grader results were captured.")
    lines.extend(["", "</details>", ""])
    return lines


def _format_blocker_failures(result: FrontierCodeResult) -> str:
    if not result.blocker_failures:
        return "none"
    return ", ".join(f"`{_inline_code(item)}`" for item in result.blocker_failures)


def _render_run_error(result: FrontierCodeResult) -> list[str]:
    exception_type = str(result.metadata.get("exception_type") or "")
    exception_message = str(result.metadata.get("exception_message") or "")
    exception_traceback = str(result.metadata.get("exception_traceback") or "")
    occurred_at = str(result.metadata.get("exception_occurred_at") or "")
    if not (exception_type or exception_message or exception_traceback):
        return []

    lines = ["Run error:"]
    if exception_type:
        lines.append(f"- Type: `{_inline_code(exception_type)}`")
    if occurred_at:
        lines.append(f"- Occurred at: `{_inline_code(occurred_at)}`")
    if exception_message:
        lines.extend(["", "Message:"])
        lines.extend(_fenced_text(exception_message))
    if exception_traceback:
        lines.extend(["", "Traceback:"])
        lines.extend(_fenced_text(exception_traceback))
    lines.append("")
    return lines


def _render_criterion_details(result: FrontierCodeResult) -> list[str]:
    lines: list[str] = []
    for criterion in result.criteria_results:
        details = criterion.details.strip()
        if not details:
            continue
        status = "PASS" if criterion.passed else "FAIL"
        lines.append(
            f"#### `{_inline_code(criterion.criterion_id)}` "
            f"({status}, score {criterion.score:.3f})"
        )
        lines.append("")
        lines.extend(_fenced_text(details))
        lines.append("")
    return lines


def _criterion_summaries(result: FrontierCodeResult) -> tuple[str, str]:
    criteria = result.criteria_results
    if not criteria:
        return "0/0", ""
    total_passed = sum(1 for item in criteria if item.passed)
    by_category: dict[str, list[bool]] = {}
    for criterion in criteria:
        by_category.setdefault(criterion.category, []).append(criterion.passed)
    category_parts = [
        f"{category} {sum(1 for passed in passed_values if passed)}/{len(passed_values)}"
        for category, passed_values in sorted(by_category.items())
    ]
    return f"{total_passed}/{len(criteria)}", ", ".join(category_parts)


def summarize_results(results: list[FrontierCodeResult]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str, str, str], list[FrontierCodeResult]] = {}
    for result in results:
        key = (
            result.task_id,
            str(result.metadata.get("agent", "unknown")),
            str(result.metadata.get("model", "unknown")),
            str(result.metadata.get("reasoning_effort", "unknown")),
        )
        groups.setdefault(key, []).append(result)

    summaries = []
    for (task_id, agent, model, effort), items in sorted(groups.items()):
        n_trials = len(items)
        summaries.append(
            {
                "task_id": task_id,
                "agent": agent,
                "model": model,
                "reasoning_effort": effort,
                "n_trials": n_trials,
                "pass_rate": sum(1 for item in items if item.passed) / n_trials,
                "average_score": sum(item.score for item in items) / n_trials,
                "mean_reward": sum(item.reward for item in items) / n_trials,
            }
        )
    return summaries


def summarize_final_results(results: list[FrontierCodeResult]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for item in summarize_results(results):
        key = (item["task_id"], item["agent"], item["model"])
        groups.setdefault(key, []).append(item)

    summaries = []
    for (task_id, agent, model), items in sorted(groups.items()):
        best = max(
            sorted(items, key=lambda item: str(item["reasoning_effort"])),
            key=lambda item: (item["average_score"], item["pass_rate"]),
        )
        summaries.append(
            {
                "task_id": task_id,
                "agent": agent,
                "model": model,
                "best_reasoning_effort": best["reasoning_effort"],
                "n_trials": best["n_trials"],
                "final_pass_rate": best["pass_rate"],
                "final_score": best["average_score"],
                "final_mean_reward": best["mean_reward"],
                "evaluated_efforts": [item["reasoning_effort"] for item in items],
            }
        )
    return summaries


def render_qa_markdown(reports: list[TaskQAReport]) -> str:
    if not reports:
        return "# FrontierCode Task QA\n\nNo tasks found.\n"
    passed = sum(1 for item in reports if item.passed)
    lines = [
        "# FrontierCode Task QA",
        "",
        f"- Tasks: {len(reports)}",
        f"- Passed: {passed}",
        f"- Failed: {len(reports) - passed}",
        "",
    ]
    for report in reports:
        lines.append(f"## {report.task_id}")
        lines.append("")
        lines.append(f"Status: {'PASS' if report.passed else 'FAIL'}")
        if report.errors:
            lines.append("")
            lines.append("Errors:")
            for error in report.errors:
                lines.append(f"- {error}")
        if report.warnings:
            lines.append("")
            lines.append("Warnings:")
            for warning in report.warnings:
                lines.append(f"- {warning}")
        lines.append("")
    return "\n".join(lines)


def _write_final_csv(path: Path, results: list[FrontierCodeResult]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "task_id",
                "agent",
                "model",
                "best_reasoning_effort",
                "n_trials",
                "final_pass_rate",
                "final_score",
                "final_mean_reward",
                "evaluated_efforts",
            ],
            lineterminator="\n",
        )
        writer.writeheader()
        for item in summarize_final_results(results):
            row = dict(item)
            row["final_pass_rate"] = f"{item['final_pass_rate']:.6f}"
            row["final_score"] = f"{item['final_score']:.6f}"
            row["final_mean_reward"] = f"{item['final_mean_reward']:.6f}"
            row["evaluated_efforts"] = ",".join(str(effort) for effort in item["evaluated_efforts"])
            writer.writerow(row)


def _write_effort_csv(path: Path, results: list[FrontierCodeResult]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "task_id",
                "agent",
                "model",
                "reasoning_effort",
                "n_trials",
                "pass_rate",
                "average_score",
                "mean_reward",
            ],
            lineterminator="\n",
        )
        writer.writeheader()
        for item in summarize_results(results):
            row = dict(item)
            row["pass_rate"] = f"{item['pass_rate']:.6f}"
            row["average_score"] = f"{item['average_score']:.6f}"
            row["mean_reward"] = f"{item['mean_reward']:.6f}"
            writer.writerow(row)


def _md(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def _html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _inline_code(value: str) -> str:
    return value.replace("`", "\\`")


def _fenced_text(value: str) -> list[str]:
    max_run = 0
    current_run = 0
    for char in value:
        if char == "`":
            current_run += 1
            max_run = max(max_run, current_run)
        else:
            current_run = 0
    fence = "`" * max(3, max_run + 1)
    return [f"{fence}text", value.rstrip(), fence]
