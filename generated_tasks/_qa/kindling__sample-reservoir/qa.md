# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__sample-reservoir

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The instruction.md clearly states the user request to correct the reservoir sampling index range without over-specifying implementation details. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | instruction.md provides clear visible guidance matching the repository's real maintaining workflow, including exact test commands, linting, building, and style instructions without exposing grader internals. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric in tests/grader/frontiercode.yaml comprehensively covers mergeability aspects including correctness, regressions, mechanical cleanliness, scope, and tests. It uses a mix of classical, reverse_classical, command, scope, and llm_prompt methods aligned with best practices. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric items in tests/grader/frontiercode.yaml have clear rationales, appropriately set blocker flags, and weights that align with the task's risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blockers in tests/grader/frontiercode.yaml correspond to true hard stops that maintainers would reject, based on evidence from calibration patches and test descriptions. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task's tests and grading pipeline include multiple criteria ensuring that broken or partial fixes fail, and only a proper fix passing a strict index range check succeeds; the visible and hidden tests from the reference patch verify out-of-bounds avoidance and reservoir sampling correctness, preventing false positives. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The frontiercode.yaml explicitly includes an alternative_valid calibration patch matching the source fix, confirming acceptance of this valid fix. The provided tests in internal/sample/sample_test.go cover the fixed behavior and do not appear overly prescriptive, allowing determinism and correctness without brittle constraints. |
| 08_agent_tests Agent Test Correctness | PASS | 0.95 | The task clearly requires adding or extending tests to cover the corrected reservoir replacement behavior. The patch includes a new test file internal/sample/sample_test.go specifically testing reservoir behavior including capacity, replacement, and reset scenarios. The grader config uses a reverse_classical method to ensure submitted visible tests fail on the broken base, confirming the tests meaningfully capture the fix. This is adequate evidence the agent tests are correct and properly validated. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The task includes explicit scope controls restricting edits to internal/sample/, sample.go, and sample_test.go with limits on number of files and changed lines, effectively preventing unrelated rewrites and excessive churn. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, patches, or reference test inputs/outputs are present in the agent-visible files; no top-level solution directory exists. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task includes a valid Dockerfile environment image, a minimal test.sh script running test criteria in the container, and a frontiercode.yaml grading config for end-to-end testing. The reference fix patch and tests run successfully in a fresh container. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The prompt states: 'Fix the inclusion/replacement decision so the chosen index always stays strictly within capacity.' and 'Keep the exported API, function signatures, and sampling semantics unchanged apart from this correctness fix.' reason: This clearly states the user-facing request and constraints while avoiding prescribing the exact patch strategy.
- [info] instruction.md evidence: It specifically instructs: 'Do not alter behavior for the not-yet-full case, and do not change how randomness is sourced; only the index range/comparison logic should change.' reason: This prevents over-specification of implementation details while guiding the core fix.
- [info] instruction.md evidence: Test guidelines and style guidelines sections provide concise and natural instructions for testing and style compliance. reason: Their inclusion supports clarity and completeness without burdening the user with excessive details.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guidelines instruct to run `go test ./internal/sample/...` matching the visible test command in grader config and repo's CONTRIBUTING.md. reason: Ensures test validation is consistent with repository's standard test execution for the impacted code area.
- [info] instruction.md evidence: Lint guidelines specify `go vet ./internal/sample/...` and `go build ./...` matching the repo's build and vet steps in github workflows and CONTRIBUTING.md. reason: Aligns visible lint/build instructions with continuous integration and maintainer expectations.
- [info] instruction.md evidence: Style guidelines direct to stay on the current snapshot branch without rebase/start from main, consistent with repo branching documented in CONTRIBUTING.md. reason: Maintains the precise workflow expected for patch submission and testing.
- [info] tests/grader/frontiercode.yaml evidence: Visible test command matches `go test ./internal/sample/...`, aligning with instruction.md and repo's go test usage. reason: Confirms visible guidance enables validating changes coherently through the repo workflow.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include classical for hidden_reference_tests_pass, reverse_classical for submitted_tests_fail_on_base, command-based visible_regression_tests_pass, and scope criteria limiting patch files and lines. reason: These objective criteria validate correct behavior, regression avoidance, and proper patch size, supporting mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Multiple patch-specific criteria use llm_prompt to assess behavior_core_requirement, edge cases, error handling, backward compatibility, test coverage, scope minimality, maintainability, and dependency fit. reason: Incorporating subjective LLM-based quality checks ensures nuanced aspects beyond mechanical tests are evaluated, improving overall assessment fidelity.
- [info] tests/grader/frontiercode.yaml evidence: Scope criterion restricts changes to internal/sample/ files with a maximum of 6 files and 250 changed lines, preventing unrelated edits and scope creep. reason: Focusing the patch reduces risk of merge conflicts, unreviewed changes, and unintended side effects, enhancing mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Test integration is checked ensuring new tests run in standard workflows (go test ./internal/sample/...), and hidden asset leak prevention ensures no private artifacts are exposed. reason: Ensuring tests integrate properly and no hidden data leakage supports clean and maintainable merges.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: All criteria have non-empty descriptions explaining their importance. reason: Meaningful rationales help reviewers and automated systems understand the check's purpose.
- [info] tests/grader/frontiercode.yaml evidence: blocker: true for critical criteria such as hidden_reference_tests_pass (weight 0.35), submitted_tests_fail_on_base (weight 0.15), visible_regression_tests_pass (weight 0.20), and scope_matches_reference_intent (weight 0.15). reason: Blocker status appears intentional and reflects critical risks to correctness and relevance.
- [info] tests/grader/frontiercode.yaml evidence: Weights sum to 1 over the main criteria, with heavy emphasis on core correctness and regression tests and lighter weights to auxiliary LLM prompt-based checks (each 0.02). reason: Weights are well calibrated relative to task scope and risk, prioritizing behavioral correctness and scope consistency.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak with appropriate commands and high weights. reason: These blocker criteria enforce that the fix solves the core correctness problem, that tests catch the broken base, no regressions occur, and scope is limited, all reasonable and necessary to prevent acceptance of invalid patches.
- [info] tests/grader/calibration/reference.patch evidence: The provided calibration patch fixes the core issue (changing `if idx <= int64(r.cap)` to `if idx < int64(r.cap)`) and passes all blockers, demonstrating that failure of these blockers indicates invalid or incomplete fixes. reason: Calibration shows the blockers catch failure to fix the critical off-by-one error, proving they represent true reject points for maintainers.
- [info] internal/sample/sample_test.go evidence: Tests added cover functionality relevant for post-fill replacement paths and verify correct reservoir capacity behavior. reason: Presence of these tests supports that test-based blockers verify meaningful correctness, and failure to pass them would block merging.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/sample/sample.go evidence: The fix: changing replacement condition from 'idx <= int64(r.cap)' to 'idx < int64(r.cap)', ensuring no index equals capacity is used. reason: Prevents out-of-range index selection for reservoir replacement, the core bug.
- [info] internal/sample/sample_test.go evidence: Tests verify early filling behavior, post-capacity sampling, stable length, and correct item retention. reason: These tests cover both common and edge cases of reservoir sampling behavior.
- [info] tests/grader/frontiercode.yaml evidence: Multiple blocker criteria: hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, and scope correctness. reason: The grading pipeline enforces that only submissions correcting the index boundary pass.
- [info] tests/grader/calibration/reference.patch evidence: Calibrated with the exact source fix patch and associated regression tests that ensure correctness. reason: This provides a robust baseline to detect false positives or weak test coverage.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-3 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-4 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Contains an alternative_valid calibration 'reference-fix' using the exact source fix commit patch. reason: This calibration defines a valid solution baseline which prevents false negatives on properly fixing the index range in reservoir sampling.
- [info] internal/sample/sample_test.go evidence: Test file includes tests for capacity, count after many observations, reset behavior, and that the items slice is copied. reason: Test coverage exercises correct reservoir behavior including boundaries and state reset without overfitting to brittle implementation details.
- [info] instruction.md evidence: Instruction explicitly requests fixing replacement index to stay strictly within capacity without changing probabilistic semantics or randomness source. reason: Ensures any accepted solution must preserve correct reservoir semantics, thus encouraging valid alternative implementations without brittle rejections.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/sample/sample_test.go evidence: New test file covering reservoir sampler under/at capacity, reset, and copy semantics. reason: These tests exercise the critical paths affected by the patch and are required to detect the original off-by-one bug.
- [info] tests/grader/frontiercode.yaml evidence: Criterion `submitted_tests_fail_on_base` uses reverse_classical method implying tests are validated by failing on base snapshot. reason: Ensures submitted tests capture the task behavior and would fail before the fix, confirming test correctness.
- [info] instruction.md evidence: Task explicitly requests adding or extending tests in internal/sample to cover post-fill replacement correctness with deterministic randomness to assert index range. reason: Test guideline confirms agent is expected to add meaningful tests for the fix.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope section with allowed_paths: ["internal/sample/", "internal/sample/sample.go", "internal/sample/sample_test.go"], max_files: 6, max_changed_lines: 250 reason: Defines clear scope criteria limiting the patch to relevant files and reasonable size.
- [info] internal/sample/sample.go evidence: Change is focused to internal/sample/sample.go with no unrelated files changed reason: Patch minimalism matches allowed_paths, reducing risk of unrelated edits.
- [info] internal/sample/sample_test.go evidence: Addition of a new test file in internal/sample/sample_test.go matching scope rules reason: Test additions are within scope and essential for validating the fix.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No embedded hidden tests, grading rubrics, or reference outputs present. reason: Instruction files must not expose hidden test data or grading keys.
- [info] task.toml evidence: No hidden test commands or grader details embedding test answers or reference outputs. reason: Task configuration must not leak hidden grader assets.
- [info] environment/repo/ evidence: Repository is a fully visible source tree with no signs of hidden test files or grader patches. reason: Agent-visible repo must exclude grader test data and hidden tests.
- [info] tests/ evidence: Hidden grader assets and reference patches exist exclusively under tests/grader/ and tests/hidden/, which are correctly not agent-visible. reason: Hidden assets must be isolated from agent-visible files per QA requirements.
- [info] no top-level solution folder evidence: No solution folder detected at the root level of the task. reason: A solution folder must not be present at the top level in agent-visible files.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/Dockerfile evidence: The Dockerfile builds a reproducible multi-stage Go environment with a builder and a minimal runtime using Debian bookworm, suitable for running tests and the main binary. reason: A proper Dockerfile enables consistent, fresh environment builds and tests, fulfilling a key packaging requirement.
- [info] tests/test.sh evidence: Calls python3 tests/hidden/run_criteria.py with the internal repo path to run test criteria. reason: Having a test script that runs all grading criteria in a fresh environment is essential for end-to-end testing.
- [info] tests/grader/frontiercode.yaml evidence: Defines multiple blocking criteria including hidden reference tests, regression tests, scope, and no asset leak, with commands that work with the environment/repo for testing. reason: The FrontierCode YAML file programs the end-to-end validation steps including baseline and submission testing in the container.
- [info] tests/grader/calibration/reference.patch evidence: Contains the source fix commit and adds a sample_test.go with meaningful tests for the reservoir sampling fix. reason: The patch tests confirm the fix correctness and integrate well into the existing test suite, supporting reproducible and meaningful validation.
- [info] task.toml evidence: Defines docker_image = 'golang:1.24-bookworm', consistent with the Go version used and allowing fresh container runs. reason: Specifying an explicit docker_image avoids host environment issues and supports fresh runs.
