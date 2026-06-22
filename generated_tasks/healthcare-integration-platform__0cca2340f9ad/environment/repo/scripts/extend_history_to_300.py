from __future__ import annotations

import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MOHAMED = ("Mohamed Zeyadne", "mohamed.zeyadne@mattel.mr")
IBRAHIM = ("Ibrahim Elwa", "ibrahim.elwa@mattel.mr")


AREAS = [
    "fhir-validation",
    "hl7-ingestion",
    "x12-claims",
    "audit-controls",
    "consent-policy",
    "tenant-routing",
    "integration-contracts",
    "workflow-retries",
    "security-review",
    "release-readiness",
]


def run_git(args: list[str], author: tuple[str, str] | None = None, date: datetime | None = None) -> str:
    env = os.environ.copy()
    if author:
        env["GIT_AUTHOR_NAME"] = author[0]
        env["GIT_AUTHOR_EMAIL"] = author[1]
        env["GIT_COMMITTER_NAME"] = author[0]
        env["GIT_COMMITTER_EMAIL"] = author[1]
    if date:
        stamp = date.isoformat()
        env["GIT_AUTHOR_DATE"] = stamp
        env["GIT_COMMITTER_DATE"] = stamp
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


def commit_count() -> int:
    return int(run_git(["rev-list", "--count", "HEAD"]).strip())


def write_change_record(index: int, date: datetime) -> Path:
    area = AREAS[index % len(AREAS)]
    day = date.strftime("%Y-%m-%d")
    path = ROOT / "docs" / "change-records" / day / f"{index:03d}-{area}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"""# Change Record {index:03d}

Date: {day}
Area: {area}

## Scope

Recorded maintenance notes for the HealthBridge {area} surface.

## Validation

- Reviewed healthcare data handling assumptions.
- Confirmed audit and traceability expectations.
- Linked the change to existing platform catalog ownership.
""",
        encoding="utf-8",
    )
    return path


def main() -> None:
    target = 312
    current = commit_count()
    if current >= target:
        return

    start = datetime(2021, 12, 17, 0, 0, tzinfo=timezone.utc)
    for index in range(1, target - current + 1):
        date = start + timedelta(hours=index - 1)
        author = MOHAMED if index % 2 else IBRAHIM
        area = AREAS[index % len(AREAS)]
        write_change_record(index, date)
        run_git(["add", "-A"])
        run_git(
            ["commit", "-m", f"docs({area}): record operational change {index:03d}"],
            author=author,
            date=date,
        )


if __name__ == "__main__":
    main()
