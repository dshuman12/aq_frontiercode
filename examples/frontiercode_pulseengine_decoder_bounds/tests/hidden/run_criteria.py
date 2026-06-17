#!/usr/bin/env python3
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


TASK_ID = "pulseengine__decoder-length-bounds"
WEIGHTS = {
    "hidden_decoder_bounds_tests": 0.35,
    "submitted_tests_fail_on_base": 0.20,
    "visible_regression_tests_pass": 0.20,
    "no_unsafe_length_addition": 0.10,
    "codec_scope_is_local": 0.10,
}

SKIP_DIRS = {".git", "build", "cmake-build-debug", "cmake-build-release", "__pycache__"}
SKIP_FILES = {".DS_Store"}
ALLOWED_CHANGED_PATHS = {
    "src/codec/decoder.cpp",
    "include/pulse/codec/decoder.hpp",
    "tests/test_codec.cpp",
}

HIDDEN_TEST = r'''
#include "test_framework.hpp"
#include "pulse/codec/decoder.hpp"

#include <vector>

using namespace pulse;

static std::vector<uint8_t> max_u64_length_payload() {
    return {
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0x01
    };
}

TEST_CASE(decoder_rejects_huge_string_length_without_throwing) {
    auto data = max_u64_length_payload();
    Decoder dec(data);
    try {
        auto r = dec.decode_string();
        ASSERT_TRUE(r.is_err());
        ASSERT_EQ(dec.position(), (size_t)10);
    } catch (...) {
        ASSERT_TRUE(false);
    }
}

TEST_CASE(decoder_rejects_huge_bytes_length_without_throwing) {
    auto data = max_u64_length_payload();
    Decoder dec(data);
    try {
        auto r = dec.decode_bytes();
        ASSERT_TRUE(r.is_err());
        ASSERT_EQ(dec.position(), (size_t)10);
    } catch (...) {
        ASSERT_TRUE(false);
    }
}

TEST_CASE(decoder_checks_lengths_against_remaining_bytes) {
    std::vector<uint8_t> data = {0x00, 0x03, 'x'};
    Decoder dec(data);
    auto first = dec.decode_uint8();
    ASSERT_TRUE(first.is_ok());

    auto r = dec.decode_string();
    ASSERT_TRUE(r.is_err());
    ASSERT_EQ(dec.position(), (size_t)2);
}

RUN_ALL_TESTS()
'''


@dataclass(frozen=True)
class Criterion:
    id: str
    category: str
    description: str
    check: Callable[[Path, Path], tuple[bool, str]]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", nargs="?", default=None)
    parser.add_argument("--criterion", choices=[item.id for item in criteria()])
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo = (Path(args.repo) if args.repo else script_dir.parents[1] / "environment" / "repo").resolve()
    selected = [item for item in criteria() if args.criterion in {None, item.id}]

    results = [evaluate_criterion(item, repo, script_dir) for item in selected]
    if args.criterion:
        result = results[0]
        print(result["details"])
        return 0 if result["passed"] else 1

    result_doc = build_result_doc(results)
    write_result_files(result_doc, repo, script_dir)
    return 0 if result_doc["pass"] else 1


def criteria() -> list[Criterion]:
    return [
        Criterion(
            "hidden_decoder_bounds_tests",
            "patch_specific",
            "Hidden decoder bounds tests pass.",
            check_hidden_decoder_bounds_tests,
        ),
        Criterion(
            "submitted_tests_fail_on_base",
            "regular",
            "Submitted visible tests fail on the broken base.",
            check_submitted_tests_fail_on_base,
        ),
        Criterion(
            "visible_regression_tests_pass",
            "regular",
            "Visible C++ regression suite passes.",
            check_visible_regression_tests_pass,
        ),
        Criterion(
            "no_unsafe_length_addition",
            "patch_specific",
            "Decoder no longer uses overflowing pos_ + length checks.",
            check_no_unsafe_length_addition,
        ),
        Criterion(
            "codec_scope_is_local",
            "regular",
            "Changed files are limited to decoder and codec tests.",
            check_codec_scope_is_local,
        ),
    ]


def evaluate_criterion(item: Criterion, repo: Path, script_dir: Path) -> dict:
    try:
        passed, details = item.check(repo, script_dir)
    except Exception as exc:
        passed = False
        details = f"{type(exc).__name__}: {exc}"
    return {
        "criterion_id": item.id,
        "passed": passed,
        "score": 1.0 if passed else 0.0,
        "blocker": True,
        "weight": WEIGHTS[item.id],
        "details": details,
        "method": "command",
        "category": item.category,
    }


def build_result_doc(results: list[dict]) -> dict:
    passed = all(item["passed"] for item in results)
    category_counts: dict[str, dict[str, int]] = {}
    for result in results:
        counts = category_counts.setdefault(result["category"], {"passed": 0, "total": 0})
        counts["total"] += 1
        if result["passed"]:
            counts["passed"] += 1
    score_total = sum(item["weight"] for item in results)
    score = (
        sum(item["score"] * item["weight"] for item in results) / score_total
        if passed and score_total
        else 0.0
    )
    return {
        "task_id": TASK_ID,
        "submission_id": "",
        "pass": passed,
        "score": score,
        "reward": 1.0 if passed else 0.0,
        "blocker_failures": [item["criterion_id"] for item in results if not item["passed"]],
        "criteria_results": results,
        "metadata": {
            "criteria_passed": sum(1 for item in results if item["passed"]),
            "criteria_total": len(results),
            "category_counts": category_counts,
        },
    }


def write_result_files(result_doc: dict, repo: Path, script_dir: Path) -> None:
    log_dir = verifier_log_dir(repo)
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "frontiercode_result.json").write_text(
        json.dumps(result_doc, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (log_dir / "reward.json").write_text(
        json.dumps({"reward": result_doc["reward"]}, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (log_dir / "submission.patch").write_text(
        render_submission_patch(script_dir / "base_repo", repo),
        encoding="utf-8",
    )


def verifier_log_dir(repo: Path) -> Path:
    candidates = []
    if os.environ.get("FRONTIERCODE_VERIFIER_LOG_DIR"):
        candidates.append(Path(os.environ["FRONTIERCODE_VERIFIER_LOG_DIR"]))
    candidates.append(Path("/logs/verifier"))
    candidates.append(repo.parent / "verifier-logs")
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
        except OSError:
            continue
        return candidate
    return repo.parent / "verifier-logs"


def check_hidden_decoder_bounds_tests(repo: Path, _: Path) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="pulseengine-hidden-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        install_hidden_test(workdir)
        build = build_tests(workdir, {"test_decoder_bounds_hidden"})
        if build.returncode != 0:
            return False, command_details("hidden test build failed", build)
        test = run_built_tests(workdir, {"test_decoder_bounds_hidden"})
    if test.returncode != 0:
        return False, command_details("hidden decoder bounds test failed", test)
    return True, "Hidden decoder bounds tests passed."


def check_submitted_tests_fail_on_base(repo: Path, script_dir: Path) -> tuple[bool, str]:
    base_repo = script_dir / "base_repo"
    with tempfile.TemporaryDirectory(prefix="pulseengine-base-tests-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(base_repo, workdir)
        shutil.copytree(repo / "tests", workdir / "tests", dirs_exist_ok=True)
        build = build_tests(workdir)
        if build.returncode != 0:
            return False, command_details("submitted tests did not build on the base snapshot", build)
        test = run_built_tests(workdir)
    if test.returncode == 0:
        return False, "Submitted tests unexpectedly passed on the hidden base snapshot."
    return True, "Submitted tests failed on the hidden base snapshot as expected."


def check_visible_regression_tests_pass(repo: Path, _: Path) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory(prefix="pulseengine-visible-") as tmp:
        workdir = Path(tmp) / "repo"
        copy_repo(repo, workdir)
        build = build_tests(workdir)
        if build.returncode != 0:
            return False, command_details("visible test build failed", build)
        test = run_built_tests(workdir)
    if test.returncode != 0:
        return False, command_details("visible regression tests failed", test)
    return True, "Visible C++ regression suite passed."


def check_no_unsafe_length_addition(repo: Path, _: Path) -> tuple[bool, str]:
    source = read_text(repo / "src" / "codec" / "decoder.cpp")
    offenders = []
    for name in ("decode_string", "decode_bytes"):
        body = function_body(source, name)
        if re.search(r"pos_\s*\+\s*(?:len|char_count|byte_count)\s*>\s*size_", body):
            offenders.append(name)
    if offenders:
        return False, "Unsafe pos_ + length bounds check remains in " + ", ".join(offenders)
    return True, "Decoder length checks avoid overflowing pos_ + length comparisons."


def check_codec_scope_is_local(repo: Path, script_dir: Path) -> tuple[bool, str]:
    base = snapshot(script_dir / "base_repo")
    current = snapshot(repo)
    changed = sorted(
        path for path in set(base) | set(current)
        if base.get(path) != current.get(path)
    )
    disallowed = [path for path in changed if not is_allowed_changed_path(path)]
    if disallowed:
        return False, "Unexpected changed files: " + ", ".join(disallowed[:20])
    if len(changed) > 4:
        return False, f"Too many changed files: {len(changed)} ({', '.join(changed)})"
    return True, "Changed files are limited to decoder and codec tests: " + (", ".join(changed) or "none")


def render_submission_patch(base_repo: Path, submitted_repo: Path) -> str:
    diff_chunks = []
    all_files = sorted(index_files(base_repo) | index_files(submitted_repo))
    for relative in all_files:
        base_path = base_repo / relative
        submitted_path = submitted_repo / relative
        base_lines = read_patch_lines(base_path)
        submitted_lines = read_patch_lines(submitted_path)
        if base_lines == submitted_lines:
            continue
        diff_chunks.extend(
            difflib.unified_diff(
                base_lines,
                submitted_lines,
                fromfile=f"a/{relative.as_posix()}",
                tofile=f"b/{relative.as_posix()}",
            )
        )
    return "".join(diff_chunks)


def index_files(root: Path) -> set[Path]:
    if not root.exists():
        return set()
    files = set()
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        if path.name in SKIP_FILES:
            continue
        files.add(relative)
    return files


def read_patch_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    try:
        return path.read_text(encoding="utf-8").splitlines(keepends=True)
    except UnicodeDecodeError:
        return [f"Binary file {path.name} differs\n"]


def install_hidden_test(workdir: Path) -> None:
    test_path = workdir / "tests" / "test_decoder_bounds_hidden.cpp"
    test_path.write_text(HIDDEN_TEST, encoding="utf-8")


def build_tests(workdir: Path, test_names: set[str] | None = None) -> subprocess.CompletedProcess[str]:
    build_dir = workdir / "build-direct"
    obj_dir = build_dir / "obj"
    bin_dir = build_dir / "bin"
    shutil.rmtree(build_dir, ignore_errors=True)
    obj_dir.mkdir(parents=True)
    bin_dir.mkdir(parents=True)

    objects = []
    for source in sorted((workdir / "src").rglob("*.cpp")):
        rel = source.relative_to(workdir).as_posix().replace("/", "__")
        obj = obj_dir / f"{rel}.o"
        result = run(
            [
                "g++",
                "-std=c++17",
                "-Wall",
                "-Wextra",
                "-Wpedantic",
                "-O2",
                "-Iinclude",
                "-c",
                str(source.relative_to(workdir)),
                "-o",
                str(obj.relative_to(workdir)),
            ],
            workdir,
        )
        if result.returncode != 0:
            return result
        objects.append(str(obj.relative_to(workdir)))

    selected_tests = [
        path
        for path in sorted((workdir / "tests").glob("test_*.cpp"))
        if test_names is None or path.stem in test_names
    ]
    if not selected_tests:
        return subprocess.CompletedProcess(
            args=["direct-build"],
            returncode=1,
            stdout="",
            stderr="No matching tests were found.",
        )

    for test_source in selected_tests:
        exe = bin_dir / test_source.stem
        result = run(
            [
                "g++",
                "-std=c++17",
                "-Wall",
                "-Wextra",
                "-Wpedantic",
                "-O2",
                "-Iinclude",
                "-Itests",
                str(test_source.relative_to(workdir)),
                *objects,
                "-o",
                str(exe.relative_to(workdir)),
            ],
            workdir,
        )
        if result.returncode != 0:
            return result

    return subprocess.CompletedProcess(
        args=["direct-build"],
        returncode=0,
        stdout=f"Built {len(selected_tests)} test executable(s).",
        stderr="",
    )


def run_built_tests(workdir: Path, test_names: set[str] | None = None) -> subprocess.CompletedProcess[str]:
    bin_dir = workdir / "build-direct" / "bin"
    executables = [
        path
        for path in sorted(bin_dir.iterdir())
        if path.is_file() and (test_names is None or path.name in test_names)
    ]
    if not executables:
        return subprocess.CompletedProcess(
            args=["direct-test"],
            returncode=1,
            stdout="",
            stderr="No built tests were found.",
        )

    output = []
    for exe in executables:
        result = run([str(exe.relative_to(workdir))], workdir)
        if result.stdout.strip():
            output.append(result.stdout.strip())
        if result.stderr.strip():
            output.append(result.stderr.strip())
        if result.returncode != 0:
            return subprocess.CompletedProcess(
                args=["direct-test"],
                returncode=result.returncode,
                stdout="\n".join(output),
                stderr=f"{exe.name} failed",
            )
    return subprocess.CompletedProcess(
        args=["direct-test"],
        returncode=0,
        stdout=f"Ran {len(executables)} test executable(s).",
        stderr="",
    )


def copy_repo(source: Path, target: Path) -> None:
    def ignore(_: str, names: list[str]) -> set[str]:
        return {name for name in names if name in SKIP_DIRS or name in SKIP_FILES}

    shutil.copytree(source, target, ignore=ignore)


def snapshot(root: Path) -> dict[str, str]:
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(root).as_posix()
        parts = set(path.relative_to(root).parts)
        if parts & SKIP_DIRS or path.name in SKIP_FILES:
            continue
        result[rel] = sha256(path)
    return result


def is_allowed_changed_path(path: str) -> bool:
    if path in ALLOWED_CHANGED_PATHS:
        return True
    return path.startswith("tests/test_decoder") and path.endswith(".cpp")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def function_body(source: str, name: str) -> str:
    match = re.search(rf"\b{re.escape(name)}\s*\([^)]*\)\s*(?:->\s*[^{{]+)?\{{", source)
    if not match:
        raise ValueError(f"Could not find function {name}")
    index = match.end() - 1
    depth = 0
    for cursor in range(index, len(source)):
        char = source[cursor]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[index + 1 : cursor]
    raise ValueError(f"Could not parse function body for {name}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=300,
        check=False,
    )


def command_details(prefix: str, result: subprocess.CompletedProcess[str]) -> str:
    output = "\n".join(part for part in [result.stdout.strip(), result.stderr.strip()] if part)
    return f"{prefix}: {output}" if output else prefix


if __name__ == "__main__":
    raise SystemExit(main())
