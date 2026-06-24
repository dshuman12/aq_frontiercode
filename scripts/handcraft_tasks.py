#!/usr/bin/env python3
"""Build FrontierCode tasks from hand-crafted bugs in clean Go repos.

For each spec, on a branch off HEAD we create a synthetic pair of commits:
  base = HEAD-tree with a subtle bug injected into the source file AND the
         module's test file deleted (so the agent gets no smoking-gun test).
  fix  = HEAD-tree with the source file correct AND the test file restored.

git diff base fix == {source: bug->correct (M), test: added (A)} which matches
the in_dist task pattern: the restored test becomes the hidden reference test
and fails when overlaid on the buggy base (gradeable).

Each repo gets one re-zipped archive (with .git) under repositories/, and a
combined row-json file is emitted for scripts/generate_frontiercode_task.py.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

REPO_ROOT = Path("/Users/anwesha/Desktop/aq_frontiercode")
ARCHIVES = {
    "bco": REPO_ROOT / "repositories/Spc6c6eUVzrMmuj0EeR4__bco.zip",
    "durab": REPO_ROOT / "repositories/rpeJuWN03rRjNHcOuZC8__durab.zip",
    "kindling": REPO_ROOT / "repositories/27LtmqQeyQGuV9A5TGcK__kindling.zip",
    "Drift": REPO_ROOT / "repositories/X8XXIPwxL5jBaLXhkNQ3__Drift.zip",
    "swarmsync": REPO_ROOT / "repositories/project_silver_repos/PxRGGPZ8XqTm8dLr9xeZ__SwarmSync_curated.zip",
    "cryograph": REPO_ROOT / "repositories/project_silver_repos/FyDhWvY9O9IA5cGn29RT__CryoGraph.zip",
}
# hash prefixes reused for the regenerated _taskgen archives
ARCHIVE_HASH = {
    "bco": "Spc6c6eUVzrMmuj0EeR4",
    "durab": "rpeJuWN03rRjNHcOuZC8",
    "kindling": "27LtmqQeyQGuV9A5TGcK",
    "Drift": "X8XXIPwxL5jBaLXhkNQ3",
    "swarmsync": "PxRGGPZ8XqTm8dLr9xeZ",
    "cryograph": "FyDhWvY9O9IA5cGn29RT",
}


def run(cmd: list[str], cwd: Path) -> str:
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"cmd {cmd} failed in {cwd}:\n{res.stdout}\n{res.stderr}")
    return res.stdout.strip()


def find_repo_root(extracted: Path) -> Path:
    for git in extracted.rglob(".git"):
        if git.is_dir():
            return git.parent
    raise FileNotFoundError(f"no .git under {extracted}")


def apply_replacements(path: Path, replacements: list[list[str]]) -> None:
    text = path.read_text()
    for old, new in replacements:
        count = text.count(old)
        if count != 1:
            raise ValueError(
                f"replacement not unique ({count}) in {path}:\n--- OLD ---\n{old}"
            )
        text = text.replace(old, new)
    path.write_text(text)


def gofmt_canonicalize(root: Path) -> None:
    """Make a Go repo gofmt-canonical so a solver's later `gofmt`/`go fmt` is a
    no-op rather than scope-blocker noise.

    Handcrafted archives are not gofmt-canonical. The scope criterion compares
    byte-exact file hashes (run_criteria.py:changed_files), so when an agent runs
    gofmt the whole tree re-aligns and every file reads as "changed" ->
    scope_matches_reference_intent fails and the task scores 0 even with a correct
    fix. Canonicalizing the baseline (it lives in BOTH base and fix trees, so it
    never shows up in diff(base, fix)) keeps every unedited file stable under the
    agent's formatter; edited files are inside the allowed scope path anyway.
    """
    if not any(root.rglob("*.go")):
        return
    if shutil.which("gofmt") is None:
        print(
            "  WARN: gofmt not found; Go repo left non-canonical. Run "
            "scripts/gofmt_canonicalize.sh <task> on the generated task(s) or the "
            "scope blocker will fail on formatter noise (0/5)."
        )
        return
    subprocess.run(["gofmt", "-w", "."], cwd=root, check=False)
    if run(["git", "status", "--porcelain"], root):
        run(["git", "add", "-A"], root)
        run(["git", "commit", "-q", "-m", "baseline: gofmt canonicalize"], root)


def build_repo(repo_key: str, specs: list[dict], out_dir: Path) -> list[dict]:
    """Create synthetic commit chain in a fresh checkout; return rows."""
    tmp = Path(tempfile.mkdtemp(prefix=f"handcraft-{repo_key}-"))
    extracted = tmp / "x"
    with zipfile.ZipFile(ARCHIVES[repo_key]) as z:
        z.extractall(extracted)
    root = find_repo_root(extracted)

    # normalize: clean tree at HEAD
    run(["git", "config", "user.email", "task@frontiercode.local"], root)
    run(["git", "config", "user.name", "FrontierCode"], root)
    run(["git", "checkout", "-f", "HEAD"], root)

    # canonicalize Go formatting at HEAD so a solver's gofmt isn't scope noise.
    gofmt_canonicalize(root)

    # baseline pre-edits (e.g. lower go.mod toolchain) applied to HEAD so they
    # live in BOTH base and fix trees and never appear in diff(base, fix).
    pre_edits: dict[str, list[list[str]]] = {}
    seen_pre: set[tuple[str, str, str]] = set()
    for spec in specs:
        for pe in spec.get("pre_edits", []):
            for old, new in pe["replacements"]:
                key = (pe["file"], old, new)
                if key in seen_pre:
                    continue
                seen_pre.add(key)
                pre_edits.setdefault(pe["file"], []).append([old, new])
    if pre_edits:
        for frel, reps in pre_edits.items():
            apply_replacements(root / frel, reps)
        run(["git", "add", "-A"], root)
        run(["git", "commit", "-q", "-m", "baseline: environment fixups"], root)
    head = run(["git", "rev-parse", "HEAD"], root)

    # A spec injects one or more bugs. Legacy form: source_file + replacements
    # (single file). New form: edits = [{file, replacements}, ...] for bundling
    # 2-3 independent defects across files into ONE task (difficulty Pattern 3).
    def spec_edits(spec):
        if "edits" in spec:
            return [(e["file"], e["replacements"]) for e in spec["edits"]]
        return [(spec["source_file"], spec["replacements"])]

    # pre-validate: drop specs whose replacement strings aren't uniquely present
    valid_specs = []
    for spec in specs:
        ok = True
        for frel, reps in spec_edits(spec):
            text = (root / frel).read_text()
            for old, _new in reps:
                if text.count(old) != 1:
                    print(f"  SKIP {spec['task_id']}: old-string not unique "
                          f"(count={text.count(old)}) in {frel}")
                    ok = False
                    break
            if not ok:
                break
        for tf in spec["delete_tests"]:
            if not (root / tf).exists():
                print(f"  SKIP {spec['task_id']}: missing test file {tf}")
                ok = False
        if ok:
            valid_specs.append(spec)
    specs = valid_specs

    rows = []
    for spec in specs:
        edits = spec_edits(spec)
        # ---- base commit: inject bug(s) + delete test files ----
        for frel, reps in edits:
            apply_replacements(root / frel, reps)
        for tf in spec["delete_tests"]:
            run(["git", "rm", "-q", tf], root)
        run(["git", "add", "-A"], root)
        run(["git", "commit", "-q", "-m", f"introduce bug: {spec['task_id']}"], root)
        base_sha = run(["git", "rev-parse", "HEAD"], root)

        # ---- fix commit: restore correct source + tests from HEAD ----
        edit_files = [frel for frel, _ in edits]
        run(["git", "checkout", head, "--", *edit_files, *spec["delete_tests"]], root)
        # optional: overwrite/strengthen a test file in the fix commit.
        # value is a path to a local file whose contents replace the repo test.
        for rel, local_path in spec.get("fix_test_overrides", {}).items():
            (root / rel).write_text(Path(local_path).read_text())
        run(["git", "add", "-A"], root)
        run(["git", "commit", "-q", "-m", f"fix: {spec['task_id']}"], root)
        fix_sha = run(["git", "rev-parse", "HEAD"], root)

        rows.append(
            {
                "Repository": spec["repository"],
                "Task ID": spec["task_id"],
                "Bug / Task Description": spec["description"],
                "Fix Commit": fix_sha,
                "Base Commit": base_sha,
                "Source Archive": spec["_archive_rel"],
                "Archive Repo Root": ".",
                "Commit Subject": spec["commit_subject"],
                "Visible Test Command Guess": spec["visible_cmd"],
            }
        )

    # ---- re-zip repo (with .git) so archive_root == "." ----
    archive_rel = specs[0]["_archive_rel"]
    archive_abs = REPO_ROOT / archive_rel
    archive_abs.parent.mkdir(parents=True, exist_ok=True)
    if archive_abs.exists():
        archive_abs.unlink()
    with zipfile.ZipFile(archive_abs, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(root.rglob("*")):
            if p.is_file() or p.is_symlink():
                z.write(p, p.relative_to(root).as_posix())
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"[{repo_key}] wrote {archive_abs.relative_to(REPO_ROOT)} with {len(rows)} task(s)")
    return rows


def main() -> int:
    spec_file = Path(sys.argv[1])
    specs = json.loads(spec_file.read_text())
    # group by repo, attach archive rel path
    by_repo: dict[str, list[dict]] = {}
    for s in specs:
        rk = s["repo_key"]
        s["_archive_rel"] = f"repositories/{ARCHIVE_HASH[rk]}__{rk}_taskgen.zip"
        by_repo.setdefault(rk, []).append(s)

    all_rows = []
    for rk, rs in by_repo.items():
        all_rows.extend(build_repo(rk, rs, REPO_ROOT))

    out = REPO_ROOT / "generated_tasks/_handcraft_rows.json"
    out.write_text(json.dumps(all_rows, indent=2))
    print(f"\nwrote {len(all_rows)} rows -> {out.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
