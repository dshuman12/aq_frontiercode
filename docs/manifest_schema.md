# FrontierCode Manifest Reference

Each Harbor task must include `tests/grader/frontiercode.yaml`. JSON and TOML
are also supported for tooling, but YAML is the intended task-facing format.

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

## Criteria

Every criterion may declare a `category`. Supported values are:

- `patch_specific`: hidden checks that target the task-specific patch behavior.
- `regular`: hidden build, formatting, reference-suite, reverse, or other general
  validation checks.

If omitted, `category` defaults to `regular` for backward compatibility.

Supported `method` values:

- `classical`: run a deterministic command, typically injected hidden tests.
- `command`: run a build, lint, typecheck, or regression command.
- `reverse_classical`: registered in the schema, but v1 requires explicit result
  evidence for this method.
- `scope`: inspect changed paths and diff size.
- `llm_prompt`: call an OpenAI-compatible chat completions endpoint and expect
  JSON with `passed`, `score`, and `rationale`.
- `adaptive_classical`: reserved for a future implementation and rejected by v1
  task QA.

## Calibration Rules

Calibration examples are mandatory.

- `hack`, `low_quality`, and `negative` examples must fail at least one blocker
  or score below `low_quality_threshold`.
- `alternative_valid` examples must pass every blocker.
- Missing or unevaluated calibration evidence fails task QA.
- `solution/` is forbidden; all private calibration assets belong under
  `tests/grader/`.

During `qa`, the false-positive check asks a reviewer-side `anthropic/claude-opus-4.8`
model with high reasoning effort to inspect the full task package, including
`tests/grader/` and `tests/hidden/`. It runs five independent adversarial
attempts concurrently, each trying to generate a bad repo-only patch that passes
blockers. If any generated patch passes and scores at or above
`low_quality_threshold`, QA fails; save that patch as a `hack` or `negative`
calibration and strengthen the relevant criterion.
