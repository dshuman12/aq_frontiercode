# FrontierCode Harbor Harness

This workspace contains a stdlib-only Python harness for evaluating Harbor tasks
that follow a FrontierCode-style contract: public repository context, private
hidden grading, blocker/non-blocker rubrics, calibration patches, and combined
pass-rate/score reporting.

Evaluation is organized as independent single-solve trajectories. For each
trial, the agent receives the task description plus repository guidelines,
produces a patch or output, and the grading pipeline evaluates that output
afterward. Internal tool use inside an agent trajectory is expected; the harness
does not model a multi-turn maintainer/evaluator feedback loop.

## Task package

The task package is the agent-visible task surface. It should include:

- `instruction.md` with the concise task description.
- The repository snapshot and correct base commit under `environment/repo/`.
- Setup and runtime assumptions, including any Harbor image or Dockerfile.
- Visible testing, lint, and style guidelines, including exact commands and the public test areas that matter.
- AGENTS-style repository conventions when applicable.
- Any visible tests or test directories the agent may edit, plus enough guidance to explain what behaviors or edge cases those tests should cover.
- The Harbor task metadata in `task.toml`.

A task is expected to use this file layout:

```text
task/
  task.toml
  instruction.md
  environment/
    repo/
  tests/
    test.sh
    grader/
      frontiercode.yaml
      calibration/
    hidden/
```

A task must include `tests/grader/frontiercode.yaml`. JSON and TOML are also
supported for tooling, but YAML is the intended task-facing format.

```yaml
task_id: repo-slug__task-id
subset: extended
repo_workdir: environment/repo
base_commit: optional-git-sha
low_quality_threshold: 0.5
criteria:
  - id: behavior
    category: patch_specific
    description: Hidden behavioral tests pass.
    method: command
    blocker: true
    weight: 0.5
    command: pytest tests/hidden
  - id: scope
    category: regular
    description: Diff stays inside the intended implementation area.
    method: scope
    blocker: true
    weight: 0.2
    scope:
      allowed_paths:
        - src/
      denied_paths:
        - docs/
      max_files: 4
      max_changed_lines: 250
  - id: quality
    description: Patch follows the codebase's local design style.
    method: llm_prompt
    blocker: false
    weight: 0.3
    threshold: 0.6
    prompt: Score whether the implementation is idiomatic, local, and maintainable.
calibrations:
  - id: known-hack
    type: hack
    criteria_results:
      - criterion_id: behavior
        passed: false
        score: 0
  - id: independent-valid-solution
    type: alternative_valid
    criteria_results:
      - criterion_id: behavior
        passed: true
        score: 1
      - criterion_id: scope
        passed: true
        score: 1
      - criterion_id: quality
        passed: true
        score: 0.8
```

There is intentionally no `solution/` folder. Calibration examples and private
rubric assets live under `tests/grader/`.

## Rubric quality control loop

The rubric should be hardened the same way a good test suite is hardened: not
just by writing one prompt, but by checking that it separates correct solutions
from bad ones and that it does not unfairly reject valid alternatives.

1. **Design** — Prefer deterministic checks for objective behavior and use prompt
   criteria only for qualities that genuinely require judgment such as style,
   readability, or architecture.
2. **Hack report** — Try adversarial or lazy solutions that look plausible but
   do not actually solve the task. If one slips through, strengthen the relevant
   command, hidden test, scope rule, or rubric prompt.
3. **False-negative check** — Try multiple valid implementations that differ in
   structure, naming, or style. If a genuinely good solution is rejected, the
   rubric is too brittle.
4. **Calibration** — Use several examples spanning low, medium, and high
   quality so reviewers can see how the rubric resolves partial or near-miss
   solutions.
5. **Review and re-review** — A maintainer/domain expert should inspect the
   task, then a second reviewer should challenge the rubric again. Send the task
   back for revision whenever a reviewer finds a gap, a shortcut, or a false
   negative.

This loop is the practical reason why task QA should look at both the public
instructions and the hidden calibration evidence together.

## Grader

The grader is hidden scoring logic for one submitted patch. It measures one
thing — **mergeability**: would a maintainer accept this patch in review? Each
criterion declares a **method** (classical, command, reverse-classical, scope,
or prompt/rubric), a **blocker** flag, and a **weight**. It evaluates:

- **Behavioral correctness** — Does the patch solve the problem?
    - *Method:* classical. Injects hidden test files into the repo, runs them,
      cleans up.
    - *Passes when:* all injected tests pass.

- **Regression safety** — Does it break anything already in the codebase?
    - *Method:* command. Runs the existing suite / build.
    - *Passes when:* exit code 0.

- **Mechanical cleanliness** — Does it pass the project's build, lint, and
  style checks?
    - *Method:* command. Runs build + formatter/linter (e.g. `make`,
      `clang_format_test`).
    - *Passes when:* every command exits 0 (clean build, no style diff).

- **Test correctness (reverse-classical)** — Did the agent write a test that
  actually captures the desired behavior?
    - *Method:* reverse-classical. Runs the agent's submitted tests against the
      original, pre-fix (broken) base commit.
    - *Passes when:* the tests **fail** on base — proving they exercise the
      change rather than passing vacuously.

- **Performance** *(task-dependent; present only when the task declares a bound)*
  — Does the patch meet the task's efficiency requirements?
    - *When it applies:* only when efficiency is part of *this* task's
      definition of "merged." Two cases attach it:
        - **Performance-as-goal** — the task *is* an optimization (e.g. reduce
          an O(n²) path to O(n), eliminate N+1 queries). A functionally correct
          but slow patch has not solved the task. Graded against an **absolute**
          bound: a runtime budget, an allocation/iteration ceiling, or an
          asserted complexity.
        - **Performance-as-guardrail** — the task is about correctness, but a
          maintainer would reject a fix that degrades performance as a side
          effect (e.g. re-reading a file inside a loop). Graded as a
          **regression check relative to the base commit**: the patched code
          must be no slower than the base by more than the task-declared
          tolerance (default: 10% wall-clock, or no change in complexity class).
    - *When it's omitted:* tasks with no efficiency dimension a reviewer would
      flag. The criterion is absent — it contributes no weight and is not a
      vacuous pass.
    - *Method:* command. Runs the task-declared benchmark or complexity check
      (absolute budget, or patched-vs-base comparison) over a fixed,
      deterministic workload so results are reproducible.
    - *Passes when:* the measured cost is within the declared absolute bound, or
      within the allowed delta of the base commit for a regression check.
      **Blocker when present.**

- **Scope** — Does the patch touch only what it needs to, with no unrelated
  refactors?
    - *Method:* scope, combining three constraint types:
        - `files`: allowed / denied / must-delete path rules (deterministic).
        - `size`: caps on changed lines, net line growth, and files modified.
        - `semantic`: LLM check on the locality and nature of a change — e.g.
          that a conversion is fully applied within the target function and
          doesn't leave a single logical statement half-changed.
    - *Passes when:* the diff satisfies all three.

- **Code quality** — Does the code follow codebase conventions, sound design,
  type safety, and stay readable to collaborators?
    - *Method:* prompt/rubric. An LLM scores the diff against a natural-language
      rubric.
    - *Passes when:* the score meets the threshold.

Aggregation rules:
- Every criterion is a **blocker** or a **non-blocker**.
    - *Blockers* are mergeability hard-stops — the things a maintainer treats as
      non-negotiable in review. These include correctness checks and
      non-correctness concerns like performance and scope.
    - *Non-blockers* are quality signals — style, type safety, readability —
      that shape the score but wouldn't by themselves block a merge.
- Criterion **weights** combine into the final score.
- **Score-zeroing:** if any blocker fails, the total score is 0. Otherwise the
  score is the weighted aggregate of the criteria the patch passes.
- **Per-criterion output:** pass/fail, score, logs, and rationale or evidence.

Score an existing Harbor job directory:

```bash
python3 -m frontiercode_harness.cli score --jobs-dir runs/harbor-job
```

## Task QA

Task QA is the meta-evaluation that proves the task and grader are fair,
robust, calibrated, and hard to game. It should include:

- (LLM) Prompt is clear, humanlike, and concise, without over-specifying the
  implementation.
  - Test by reviewing `instruction.md` against the public task surface in `environment/repo/`. The prompt should state the user-facing request and required constraints, but should not prescribe the exact patch strategy unless the real maintainer request would do so. 
- (LLM) Visible testing, lint, build, and style guidance matches the repo's real
  maintainer workflow.
  - Test by running or dry-running the visible commands from `instruction.md`
    inside `environment/repo/`, then comparing them with repo-local guidance
    such as `README*`, `CONTRIBUTING*`, `AGENTS.md`, build files, package
    scripts, Makefiles, and visible test directories. Do not add generic
    commands that are not supported by the repo.
- (LLM) Rubric covers mergeability, not just correctness: behavior, regressions,
  mechanical cleanliness, tests, scope, and code quality.
  - Test by inspecting `tests/grader/frontiercode.yaml`. Objective behavior,
    regression, build, lint, formatting, and test-correctness checks should be
    represented by `classical`, `command`, `reverse_classical`, or `scope`
    criteria when applicable. Subjective quality should use `llm_prompt`.
    Hidden deterministic assets belong under `tests/hidden/`.
- (Deterministic, LLM) Each rubric item has a rationale, blocker/non-blocker status, and calibrated
  weight.
  - (Deterministic) Test by inspecting `tests/grader/frontiercode.yaml` that checks that `tests/grader/frontiercode.yaml` exists, criteria exist and have supported methods, each criterion has a positive weight, each criterion has a valid threshold. There's at least one criterion that is a blocker. 
  - (LLM) The LLM confirms that each criterion's `description` or `prompt` explains why the criterion matters, that its blocker/non-blocker status looks intentional, and that its weight looks calibrated relative to the task's risk and scope. The deterministic QA result is used as supporting evidence for structural manifest validity.
  - (LLM) The LLM must confirm that each criterion's `description` or `prompt` explains why the criterion matters. 
- (LLM) Blockers represent true hard stops a maintainer would reject in review.
  - Test by reviewing every `blocker: true` criterion in
    `tests/grader/frontiercode.yaml` with the maintainer or domain reviewer. Then run calibration examples and confirm blocker failures correspond to patches that would not be merged.
- (LLM) False-positive checks ensure wrong solutions cannot pass because of weak
  tests or rubric gaps.
  - Test by adding `hack`, `low_quality`, or `negative` calibration entries in
    `tests/grader/frontiercode.yaml`. Each calibration must provide evaluated
    evidence through `criteria_results`, `result_path`, or a patch under
    `tests/grader/`. `qa` fails if a negative calibration passes blockers and
    scores at or above `low_quality_threshold`.
  - Test by writing at least one negative calibration for each plausible shortcut
    or exploit. If a wrong patch passes, strengthen the relevant command,
    hidden test in `tests/hidden/`, scope rule, or LLM prompt in
    `tests/grader/frontiercode.yaml`.
  - (Live agent, not yet implemented) Run an adversarial agent against the
    public surface (`instruction.md` + `environment/repo/`, without
    `tests/hidden/` or `tests/grader/`) with the goal of producing a patch that
    **passes the blockers without actually solving the task**. Any such patch
    scoring at or above `low_quality_threshold` is a false positive; capture it
    as a new `hack`/`negative` calibration and harden the rubric. Not run by
    `cli qa` today.
- (LLM) False-negative checks ensure valid non-canonical solutions are not rejected
  for brittle details.
  - Test by adding `alternative_valid` calibration entries in
    `tests/grader/frontiercode.yaml`. `qa` fails if an alternative-valid
    calibration fails any blocker. For open-ended tasks, include more than one
    independent valid solution.
  - (Live agent, not yet implemented) Generate diverse valid solutions with an
    agent — varying strategy, naming, and structure while preserving correct
    behavior — and grade them. Any genuinely-valid solution that trips a blocker
    is a false negative (rubric too rigid, e.g. keyed to exact strings or
    function names); capture it as an `alternative_valid` calibration and loosen
    the offending criterion. Not run by `cli qa` today.
- (LLM) Agent-written tests, when required, are checked for meaning, ideally by
  running them against the broken base and confirming they fail.
  - Test with a `reverse_classical` or explicit `command` criterion in
    `tests/grader/frontiercode.yaml`. The criterion should run the submitted
    tests against the base snapshot or equivalent hidden fixture under
    `tests/hidden/`, for example `tests/hidden/base_repo/` when that fixture is
    present. In v1, `reverse_classical` requires explicit evaluated result
    evidence during task QA.
- (LLM) Scope checks prevent unrelated rewrites, excessive diff size, and unnecessary
  file churn.
  - Test with a `method: scope` criterion in `tests/grader/frontiercode.yaml`
    using `allowed_paths`, `denied_paths`, `max_files`, and
    `max_changed_lines`. For patch-based calibrations, `qa` parses the diff and
    verifies these constraints.
  - If there is no explicit criterion, decide whether command criteria or task shape 
    still meaningfully constrain scope
- (LLM) Hidden grader assets, rubrics, reference material, and calibration patches do
  not leak to the agent.
  - Test by inspecting the agent-visible files: `instruction.md`, `task.toml`,
    and `environment/repo/`. They must not contain hidden tests, grading
    prompts, reference outputs, calibration patches, or rubric answers from
    `tests/grader/` or `tests/hidden/`. The current QA also fails any task that
    contains a top-level `solution/` folder.
- (Deterministic, LLM) End-to-end packaging is tested in a fresh environment, including
  `tests/test.sh`, Docker/image setup, dependency install, and expected output
  schema.
  - Test by running `python3 -m frontiercode_harness.cli qa --path <task>` for
    structure and calibration, then run the task through Harbor or a fresh
    container using the same `task.toml`, `environment/Dockerfile` or
    `docker_image`, and `tests/test.sh` that agents will use. The run should
    produce the expected FrontierCode result fields: pass/fail, score, reward,
    blocker failures, and per-criterion results.

Characteristics of the eval: 

- Deterministic checks are preferred for objective behavior; LLM/rubric grading
  is reserved for quality, idiom, readability, architecture, and style judgment.
  - Test by reviewing the `method` field for each criterion in
    `tests/grader/frontiercode.yaml`. Anything objectively checkable should use
    `classical`, `command`, `reverse_classical`, or `scope`; `llm_prompt` should
    be reserved for criteria that require judgment.
- Rubric calibration uses several patches spanning low, medium, and high scores.
  - Test by reviewing the `calibrations` block in
    `tests/grader/frontiercode.yaml` and the referenced evidence under
    `tests/grader/`. The current QA enforces at least one negative calibration
    and at least one `alternative_valid` calibration; reviewers should require
    additional medium-quality examples when the rubric has enough resolution to
    score partial-but-mergeable work.
- Human review includes the relevant maintainer/domain expert plus independent
  eval review.
  - Test through manual signoff before accepting the task. This repo does not
    currently define a canonical file path for review signoff, so do not treat
    `qa` output alone as evidence that this gate passed.

Run the structural and calibration QA checks:

```bash
python3 -m frontiercode_harness.cli qa --path examples/frontiercode_toy
```

## Evaluation protocol

The evaluation protocol is benchmark-level run policy. It should include:

- The model matrix.
- Reasoning-effort settings.
- Trial count per `(task, model, reasoning effort)` group.
- Timeouts, retries, and failure handling.
- Harbor launch settings and jobs directory policy.
- Metric definitions (score and pass rate)
- Score and pass-rate aggregation.
- Reporting format and artifacts.

Launch Harbor through the harness:

```bash
python3 -m frontiercode_harness.cli eval \
  --path path/to/frontiercode-harbor \
  --agent codex \
  --model gpt-5 \
  --reasoning-effort high \
  --trials 5 \
  --jobs-dir runs
```


### Model matrix

A run sweeps the cross-product `model × reasoning-effort`, with `--trials` 
independent attempts per `(task, model, reasoning effort)` cell. Models and 
efforts are specified at launch, not fixed in this repo:

- `--model` is given once per model; run the harness once per model in the 
  matrix (or script the loop).
- `--reasoning-effort` is repeatable and **per-model** — only sweep efforts a 
  given model actually exposes. A benchmark-faithful run names them explicitly, 
  e.g. `--reasoning-effort low --reasoning-effort medium --reasoning-effort high`.

The exact models and efforts evaluated in a given run are recorded in that run's 
manifest under `--jobs-dir`, not enumerated here.

Reasoning-effort settings
`--reasoning-effort` is required and repeatable. A benchmark-faithful matrix can
name multiple efforts explicitly, for example `--reasoning-effort low
--reasoning-effort medium --reasoning-effort high`. Each effort is launched as a
separate Harbor job, and `--trials 5` means five independent agent attempts for
each `(task, model, reasoning effort)` group.

Metrics

Each rubric criterion is either a **blocker** (a hard stop a maintainer would
not merge past) or a **non-blocker** (a quality signal such as style or
readability). Every criterion carries a weight.

For a single trial:

- **pass** — the trial passes if and only if it clears *every* blocker
  criterion; otherwise it fails.
- **score** — the weighted aggregate of the rubric items the trial satisfies,
  **gated by blockers**: any trial that fails a blocker scores `0`, regardless
  of how many non-blockers it satisfies. Score is not a raw rubric sum.

Score and pass-rate aggregation 

Each model is run at every available reasoning effort level with 5 independent trials per `(task, model, reasoning effort)` group. For each effort level score and pass-rate are averaged across the 5 trials:
effort_score(task, model, reasoning_effort) = mean(score across 5 trials)
effort_pass_rate(task, model, reasoning_effort) = mean(passed across 5 trials)

A model's reported score is its best performing effort level:
best_effort(task, model) = argmax over efforts of effort_score(task, model, effort)
final_score(task, model)     = effort_score(task, model, best_effort)
final_pass_rate(task, model) = effort_pass_rate(task, model, best_effort)

