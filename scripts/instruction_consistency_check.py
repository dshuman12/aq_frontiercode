#!/usr/bin/env python3
"""Instruction <-> hidden-test consistency gate.

QA reviews the agent-visible surface (instruction + repo) but never sees the hidden tests,
so it can't catch the failure mode where a multi-part commit's instruction (from the commit
subject) describes a DIFFERENT part of the code than the hidden tests actually check
(e.g. meridian: instruction = "cycles", hidden tests = centrality/flow/shortest_path).
Such tasks are unsolvable-as-written and waste eval budget.

This deterministic check extracts the repo symbols/modules the hidden reference tests import
and exercise, and measures how many appear in instruction.md. Low overlap => likely mis-generated.

Usage:
  python3 scripts/instruction_consistency_check.py [TASK ...]      # specific tasks
  python3 scripts/instruction_consistency_check.py --all           # all generated tasks
  python3 scripts/instruction_consistency_check.py --threshold 0.3
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generated_tasks"

STDLIB_OR_TEST = {
    "pytest", "unittest", "typing", "os", "sys", "re", "json", "math", "time", "datetime",
    "collections", "itertools", "functools", "pathlib", "dataclasses", "abc", "enum",
    "asyncio", "random", "string", "io", "contextlib", "tempfile", "subprocess", "warnings",
    "mock", "freezegun", "hypothesis", "numpy", "np", "pandas", "pd", "__future__",
}

def camel_snake_words(sym: str) -> set[str]:
    """Break a symbol into lowercase word tokens for fuzzy matching against prose."""
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", sym)
    return {w for w in re.split(r"[_\s.]+", s.lower()) if len(w) > 2}

def extract_test_symbols(test_files: list[Path]) -> tuple[set[str], set[str]]:
    """Return (modules, symbols) the tests import from the repo (excluding stdlib/test libs)."""
    modules, symbols = set(), set()
    for f in test_files:
        try:
            txt = f.read_text(errors="ignore")
        except OSError:
            continue
        for mod, names in re.findall(r"^\s*from\s+([\w.]+)\s+import\s+([^\n#]+)", txt, re.M):
            top = mod.split(".")[0]
            if top in STDLIB_OR_TEST:
                continue
            modules.add(mod)
            for n in re.split(r"[,\s()]+", names):
                n = n.strip().strip("\\")
                if n and n != "as" and not n.isupper() or (n and "_" in n):
                    if n and n.lower() not in {"as"}:
                        symbols.add(n)
        for mod in re.findall(r"^\s*import\s+([\w.]+)", txt, re.M):
            if mod.split(".")[0] not in STDLIB_OR_TEST:
                modules.add(mod)
    return modules, symbols

TEST_EXTS = (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".cpp", ".cc", ".cxx", ".h", ".hpp")

CALL_STOP = {
    # test frameworks
    "assert", "asserteq", "assertequal", "asserttrue", "assertfalse", "assertraises",
    "assertalmostequal", "assertnear", "assertgt", "assertin", "expect", "describe", "test",
    "beforeeach", "aftereach", "require", "raises", "approx", "fixture", "parametrize",
    # builtins / stdlib (Python, JS, C++) — calling these is never a "missing API"
    "print", "range", "len", "list", "dict", "tuple", "set", "frozenset", "sorted", "reversed",
    "enumerate", "super", "isinstance", "issubclass", "type", "repr", "format", "main", "zip",
    "map", "filter", "int", "str", "float", "bool", "bytes", "bytearray", "abs", "min", "max",
    "sum", "round", "any", "all", "open", "iter", "next", "getattr", "setattr", "hasattr", "vars",
    "array", "object", "string", "number", "boolean", "math", "json", "promise", "parseint",
    "parsefloat", "vector", "make_pair", "move", "to_string", "printf", "malloc", "free", "size",
    # language keywords that can look like calls (`while (`, `if (`, `switch (`)
    "while", "for", "if", "else", "elif", "switch", "case", "catch", "try", "return", "throw",
    "new", "delete", "sizeof", "typeof", "await", "yield", "with", "do", "break", "continue",
    "default", "using", "namespace", "struct", "enum", "static", "const", "void", "template",
    # common exceptions / stdlib classes (calling them is not a "missing API")
    "runtimeerror", "valueerror", "typeerror", "keyerror", "indexerror", "attributeerror",
    "exception", "baseexception", "stopiteration", "notimplementederror", "filenotfounderror",
    "oserror", "ioerror", "importerror", "assertionerror", "zerodivisionerror", "lookuperror",
    "object", "property", "staticmethod", "classmethod", "callable", "simplenamespace",
    "namedtuple", "defaultdict", "counter", "ordereddict", "deque", "datetime", "date",
    "timedelta", "decimal", "fraction", "path", "lock", "thread", "queue", "enum", "dataclass",
    "field", "error", "rangeerror", "regexp", "weakmap", "symbol", "proxy", "reflect",
    # JS/TS keywords + Node/global builtins (often called bare or via destructured require)
    "async", "function", "export", "import", "instanceof", "settimeout", "setinterval",
    "cleartimeout", "clearinterval", "setimmediate", "queuemicrotask", "fetch", "require",
    "isnan", "isfinite", "encodeuricomponent", "decodeuricomponent", "structuredclone",
    "join", "resolve", "reject", "dirname", "basename", "extname", "normalize", "relative",
    "mkdirsync", "readfilesync", "writefilesync", "existssync", "mkdtempsync", "rmsync",
    "unlinksync", "statsync", "readdirsync", "issymboliclink", "isdirectory", "isfile",
    "readfile", "writefile", "mkdir", "readdir", "stringify", "keys", "values", "entries",
    "assign", "freeze", "tobe", "toequal", "tohavebeencalled", "tothrow", "tocontain",
    "symlinksync", "tmpdir", "homedir", "cwd", "platform", "hostname", "rmdirsync",
    "copyfilesync", "chmodsync", "realpathsync", "lstatsync", "appendfilesync",
}

def called_symbols(text: str) -> set[str]:
    """Identifiers invoked as plain function calls in the test (potential APIs the agent must
    provide). Excludes method calls (`.foo(`) and test-function definitions (`def test_...`)."""
    out = set()
    # `(^|[^.\w])` => not preceded by `.` (method) or another word char
    for m in re.finditer(r"(?:^|[^.\w])([A-Za-z_][A-Za-z0-9_]{3,})\s*\(", text):
        s = m.group(1)
        if s.lower() in CALL_STOP or s.isupper() or s.lower().startswith("test"):
            continue
        out.add(s)
    return out

_DEF_PATTERNS = [
    r"(?:^|\s)(?:async\s+)?def\s+([A-Za-z_]\w+)", r"(?:^|\s)class\s+([A-Za-z_]\w+)",
    r"function\s+([A-Za-z_]\w+)", r"(?:const|let|var)\s+([A-Za-z_]\w+)\s*=",
    r"func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w+)",
    r"[A-Za-z_][\w:<>,&*\s]*\s+([A-Za-z_]\w+)\s*\([^;{)]*\)\s*[{;]",  # C/C++ func def/decl
    r"#define\s+([A-Za-z_]\w+)",
]

def defined_symbols_from_text(text: str) -> set[str]:
    defs = set()
    for p in _DEF_PATTERNS:
        for m in re.finditer(p, text):
            defs.add(m.group(1))
    return defs

def defined_symbols(repo: Path) -> set[str]:
    """Symbols already DEFINED in the base repo (so a test calling them is not a missing API).
    Permissive superset across languages -- over-including only reduces false positives."""
    defs = set()
    exts = (".py", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".ts", ".tsx", ".js", ".jsx", ".go", ".java")
    try:
        for f in repo.rglob("*"):
            if not f.is_file() or f.suffix not in exts or "node_modules" in f.parts:
                continue
            try:
                defs |= defined_symbols_from_text(f.read_text(errors="ignore"))
            except OSError:
                continue
    except OSError:
        pass
    return defs

def reference_test_files(task_dir: Path) -> list[Path]:
    root = task_dir / "tests" / "hidden" / "reference_tests"
    return [p for p in root.rglob("*") if p.is_file() and p.suffix in TEST_EXTS] if root.exists() else []

def file_topics(test_files: list[Path]) -> set[str]:
    """Distinctive topic of each hidden test file, from its name (test_centrality.py -> 'centrality',
    payment.test.ts -> 'payment'). The cleanest signal for a topic mismatch like meridian."""
    topics = set()
    for f in test_files:
        stem = re.sub(r"(\.test|\.spec|_test|test_)", " ", f.stem, flags=re.I).strip()
        for w in camel_snake_words(stem):
            if w not in {"test", "tests", "spec", "index"}:
                topics.add(w)
    return topics

def check_task(task_dir: Path) -> dict:
    instr = task_dir / "instruction.md"
    if not instr.exists():
        return {"task": task_dir.name, "status": "no-instruction"}
    text = instr.read_text(errors="ignore").lower()
    test_files = reference_test_files(task_dir)
    if not test_files:
        return {"task": task_dir.name, "status": "no-hidden-tests"}
    modules, symbols = extract_test_symbols(test_files)
    # PRIMARY signal: do the hidden test FILE TOPICS appear in the instruction? (catches
    # topic mismatches like meridian even when symbol vocabulary overlaps)
    topics = file_topics(test_files)
    topics_covered = {t for t in topics if t in text}
    topic_cov = len(topics_covered) / len(topics) if topics else 1.0
    # SECONDARY: symbol coverage
    targets = symbols | {m.split(".")[-1] for m in modules}
    sym_covered = set()
    for t in targets:
        toks = camel_snake_words(t)
        if t.lower() in text or (toks and all(w in text for w in toks)):
            sym_covered.add(t)
    sym_cov = len(sym_covered) / len(targets) if targets else 1.0
    # PRECISE signal: symbols the test CALLS that the fix INTRODUCES (not in base repo) and the
    # instruction never names -> the agent can't know to implement them -> compile/import mis-gen
    # (meridian/timewindow/cryograph class). Existing repo functions are excluded via base defs.
    called, test_text = set(), ""
    for f in test_files:
        try:
            t = f.read_text(errors="ignore")
        except OSError:
            continue
        test_text += "\n" + t
        called |= called_symbols(t)
    # exclude symbols defined in base repo, in the test files themselves (helpers), OR imported
    # from external libraries (`from x import Y` -> Y is a dependency, not an API the agent adds)
    known = (defined_symbols(task_dir / "environment" / "repo")
             | defined_symbols_from_text(test_text) | symbols)
    required_new = {s for s in called if s not in known}
    req_missing = sorted(s for s in required_new if s.lower() not in text)
    return {
        "task": task_dir.name, "status": "ok",
        "topic_cov": round(topic_cov, 2), "sym_cov": round(sym_cov, 2),
        "topics_missing": sorted(topics - topics_covered)[:8],
        "req_missing": req_missing[:8], "n_req_missing": len(req_missing),
        "test_files": [f.name for f in test_files],
    }

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("tasks", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--threshold", type=float, default=0.3)
    args = ap.parse_args()

    if args.all:
        dirs = [p for p in GEN.iterdir() if p.is_dir() and (p / "instruction.md").exists()]
        dirs += [p for p in (GEN / "in_dist").glob("*") if (p / "instruction.md").exists()] if (GEN / "in_dist").exists() else []
    else:
        dirs = []
        for t in args.tasks:
            for cand in (GEN / t, GEN / "in_dist" / t):
                if cand.exists():
                    dirs.append(cand); break
    results = [check_task(d) for d in sorted(set(dirs))]
    ok = [r for r in results if r.get("status") == "ok"]
    # MIS-GEN if topics are largely absent OR the test needs fix-introduced symbols the
    # instruction never names (the precise, low-false-positive signal).
    def is_misgen(r):
        return r["topic_cov"] < args.threshold or r["n_req_missing"] > 0
    flagged = [r for r in ok if is_misgen(r)]
    print(f"Checked {len(results)} task(s). MIS-GEN flagged: {len(flagged)}\n")
    print(f"  {'task':38} {'topicCov':>8} {'reqMiss':>7}  fix-introduced symbols the test needs but the instruction omits")
    for r in sorted(ok, key=lambda x: (x["n_req_missing"] == 0, x["topic_cov"])):
        mark = "  <-- MIS-GEN" if is_misgen(r) else ""
        detail = ", ".join(r["req_missing"][:5]) or (", ".join(r["topics_missing"][:4]) if r["topic_cov"] < args.threshold else "")
        print(f"  {r['task'][:38]:38} {r['topic_cov']:>8} {r['n_req_missing']:>7}  {detail}{mark}")
    other = [r for r in results if r.get("status") != "ok"]
    if other:
        print("\nnon-scored:", [(r['task'], r['status']) for r in other])

if __name__ == "__main__":
    main()
