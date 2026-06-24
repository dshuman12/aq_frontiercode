# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__jobqueue-backoff

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt clearly instructs to fix the off-by-one doubling in the retry backoff calculation with concise constraints, avoiding over-specific patch methods while emphasizing preservation of public API and behavior. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible workflow instructions align well with repository scripts and documentation; the provided test and lint commands match the real maintainer workflow. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric in tests/grader/frontiercode.yaml covers mergeability aspects well, including correctness, regressions, scope, code quality, and test integration with a balanced combination of classical, reverse_classical, scope, command, and llm_prompt methods. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 0.95 | Each rubric criterion in tests/grader/frontiercode.yaml includes a meaningful rationale, proper blocker status, and calibrated weights aligned with the task scope and risk. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blocker criteria in tests/grader/frontiercode.yaml represent true hard stops for merge, as they verify correctness and regression prevention for the backoff fix. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task includes hidden reference tests that verify exact backoff delay behavior per attempt, ensuring no off-by-one doubling errors can pass unnoticed. The calibrations confirm the base repo fails these tests while the reference-fix patch passes, showing the tests correctly distinguish correct from incorrect implementations without allowing false positives. Adversarial probe: Adversarial agent did not find a candidate patch. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The frontiercode.yaml includes an alternative_valid calibration referencing the exact source fix commit patch and comprehensive tests in internal/jobqueue/jobqueue_test.go that validate correct exponential backoff behavior starting at the base delay and doubling per attempt. The tests cover boundary cases, attempt limits, and integration with queue logic, demonstrating resistance to false negatives. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task explicitly requires adding or updating tests in internal/jobqueue to assert retry delay behavior. The hidden grader includes a new file internal/jobqueue/jobqueue_test.go with multiple relevant tests. The 'submitted_tests_fail_on_base' criterion confirms that these tests fail against the broken base and pass with the fix, ensuring they meaningfully validate the correction. The visible regression test also passes. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The task uses explicit scope controls in the frontiercode.yaml grader configuration, restricting allowed paths to relevant internal/jobqueue files and limiting max files and changed lines, effectively constraining scope. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, test patches, or hidden tests appear in visible files or agent-accessible repo; the top-level solution folder is absent as required. |
| 11_packaging_e2e End To End Packaging | PASS | 1.00 | The task is fully packaged and passes deterministic testing in a fresh environment. The Dockerfile is complete for build and runtime, tests/test.sh runs the hidden run_criteria script, and the visible and hidden test criteria pass as per frontiercode.yaml with the reference fix patch. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The retry backoff grows one extra doubling; fix so first retry equals base delay, second doubles, etc., preserving max delay cap, jitter, and public APIs with no restructuring. reason: This clearly states the user facing request and constraints, focusing the fix on an arithmetic correction only.
- [info] instruction.md evidence: Instructions specify 'do not restructure the queue, change how attempts are tracked, or alter unrelated scheduling logic.' reason: This guidance prevents over-specification of implementation details beyond the required backoff fix.
- [info] instruction.md evidence: Success is described as retry delays starting at base delay and doubling per attempt, with tests to assert this behavior and boundary conditions. reason: Clear acceptance criteria make requirements unambiguous and help keep the prompt user-friendly and actionable.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guidelines specify running 'go test ./internal/jobqueue/...', matching the visible test files and documented repo testing commands in CONTRIBUTING.md and GitHub workflows. reason: This ensures the visible test instruction uses real package paths with existing Go tests for validation.
- [info] instruction.md evidence: Lint guidelines instruct to run 'go build ./...' and 'go vet ./...', consistent with the CI workflow steps in environment/repo/.github/workflows/ci.yml and repo CONTRIBUTING.md instructions. reason: Linting guidance matches the official CI and local developer workflows, supporting consistent quality checks.
- [info] instruction.md evidence: The instruction does not expose grader commands or hidden assets and refers testers to the visible package internal/jobqueue for tests. reason: Avoiding exposure of hidden assets and grading-specific commands aligns with the requirement to enable validation without leaking grader internals.
- [info] tests/grader/frontiercode.yaml evidence: Visible regression test command criterion uses 'go test ./internal/jobqueue/...', matching instruction.md test guidance. reason: Verification commands in grader config match the visible guidance, ensuring consistency.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include classical (hidden_reference_tests_pass), reverse_classical (submitted_tests_fail_on_base), command (visible_regression_tests_pass), scope (scope_matches_reference_intent) methods reason: These methods objectively verify behavioral correctness, regression pass/fail dynamics, and code change scope, ensuring rigorous mergeability checks beyond mere correctness.
- [info] tests/grader/frontiercode.yaml evidence: Subjective criteria use llm_prompt methods for behavior_core_requirement, behavior_edge_cases, behavior_error_handling, behavior_backward_compatibility, test coverage, maintainability, and dependency evaluation reason: These subjective prompts provide qualitative assessment of code quality, edge cases, error handling, backward compatibility, and integration sanity.
- [info] tests/grader/frontiercode.yaml evidence: Scope restrictions limit changes to internal/jobqueue/ area with max files = 6 and max changed lines = 261 reason: This ensures the patch remains focused on the relevant implementation area without unrelated rewrites or churn.
- [info] tests/grader/frontiercode.yaml evidence: Reference test files internal/jobqueue/jobqueue_test.go are included and tested against reason: This ensures the patch has targeted test coverage relating directly to the fixed behavior and regression areas.
- [info] tests/grader/frontiercode.yaml evidence: No hidden asset leak criterion enforces no grader assets or hidden tests contaminate the visible repo reason: Maintains a clean visible codebase and clear boundary between test assets to avoid confusion or exposure of internal testing artifacts.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria have clear descriptions explaining their importance, e.g., hidden_reference_tests_pass ensures hidden behavioral tests pass, submitted_tests_fail_on_base confirms tests fail on base, etc. reason: Meaningful rationale in descriptions helps reviewers understand why each criterion matters.
- [info] tests/grader/frontiercode.yaml evidence: Blocker true flags are set on critical criteria that directly impact correctness and scope: hidden_reference_tests_pass (0.35), submitted_tests_fail_on_base (0.15), visible_regression_tests_pass (0.20), scope_matches_reference_intent (0.15), no_hidden_asset_leak (0.05). reason: Blocker flags align with expected critical criteria for task correctness and scope.
- [info] tests/grader/frontiercode.yaml evidence: Weights summing prominently to 0.90 for main blockers reflect appropriate calibration given the task risk; minor behavioral and maintainability aspects have 0.02 weights each to recognize without over-emphasis. reason: Weight calibration balances critical correctness criteria against lower risk maintainability and coverage factors.
- [info] tests/grader/frontiercode.yaml evidence: Calibrations include a no-op baseline and a reference-fix patch with expected pass/fail results, supporting rubric validity. reason: Calibration supports trust in the rubric's blocker status and weight assignments as intentional and correct.

### 05_blocker_validity Blocker Validity

Findings:
- [fail] tests/grader/frontiercode.yaml evidence: Blockers 'hidden_reference_tests_pass', 'submitted_tests_fail_on_base', and 'visible_regression_tests_pass' ensure the patch fixes the incorrect backoff doubling and does not regress. reason: These blockers gate on tests that catch the off-by-one exponential backoff doubling error, preventing patches that fail correctness or cause regressions from merging.
- [fail] tests/grader/frontiercode.yaml evidence: The 'scope_matches_reference_intent' blocker enforces patch minimality and focus within internal/jobqueue/ reason: This prevents unrelated or overbroad patch changes that would complicate review or introduce unrelated issues.
- [fail] tests/grader/frontiercode.yaml evidence: 'no_hidden_asset_leak' blocker ensures no grader artifacts or references leak into visible repo after patch. reason: Avoids contamination of public repository with grader or hidden test data, reducing confusion and potential leaks.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/jobqueue/jobqueue_test.go evidence: Test in hidden reference patch asserts retry delay equals base on first retry and doubles properly on subsequent retries. reason: This test ensures the core fix (correct exponential backoff counting) is validated, preventing shortcuts that use incorrect doubling.
- [info] tests/grader/frontiercode.yaml evidence: Criterion hidden_reference_tests_pass blocks submission if hidden backoff tests fail, preventing acceptance of broken doubling behavior. reason: This criterion enforces that submitted fixes must pass thorough hidden behavioral tests that cover the requested arithmetic fix.
- [info] tests/grader/calibration/reference.patch evidence: Patch changes for-loop start from i=0 to i=1 to fix off-by-one doubling; tests reflect this exact expectation. reason: The patch and tests target the exact off-by-one doubling issue, reducing risk of passing weak tests or unrelated hacks.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-3 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-4 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Presence of alternative_valid calibration 'reference-fix' with fix_commit patch and passing detailed criteria including hidden_reference_tests_pass and regression_reference_area_preserved. reason: An authoritative reference fix patch and associated tests clarify accepted solutions, preventing false negatives on valid fixes.
- [info] internal/jobqueue/jobqueue_test.go evidence: Tests include TestRetryOnFail verifying retry delays start at base and double properly per attempt, and test cases for exhausting attempts, visibility reclaim, and correct state transitions. reason: Comprehensive test coverage in the module ensures legitimate variations in backoff implementations adhering to doubling semantics are accepted.
- [info] instruction.md evidence: Instruction mandates only a fix of the off-by-one doubling in exponential backoff with unchanged public APIs and test coverage for base delay and doubling behavior. reason: Encourages focused patch scope and behavior-based testing rather than brittle pattern matching of implementation.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/jobqueue/jobqueue_test.go evidence: New test file added that includes TestRetryOnFail validating attempt count and retry logic. reason: This test directly asserts the delay retry behavior the task requests be fixed and tested.
- [info] tests/grader/frontiercode.yaml evidence: 'submitted_tests_fail_on_base' uses reverse_classical requiring visible tests to fail on base. reason: This confirms tests exist and are meaningfully validating the fix by failing on the broken base.
- [info] tests/grader/calibration/reference.patch evidence: Patch adjusts loop bounds in backoff delay multiplication, matching task description. reason: The patch and tests are consistent in fixing the off-by-one doubling and validating it.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope entry with allowed_paths including internal/jobqueue/, jobqueue.go, and jobqueue_test.go; max_files: 6; max_changed_lines: 261 reason: Defines explicit allowed paths and size limits to avoid unrelated rewrites and broad file churn.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No grader assets, hidden tests, or reference outputs found in text content. reason: Instruction file must not leak any hidden grading or reference material.
- [info] task.toml evidence: Configuration does not reference grader files or hidden tests. reason: Task config must not expose hidden tests, patches, or grader artifacts.
- [info] environment/repo/ evidence: The repo folder contains source and tests but no hidden test files or grader patches. reason: The main source directory must not contain grader or hidden test material.
- [info] tests/ evidence: Hidden tests and grader files are only under tests/hidden or tests/grader, not in agent-visible environment/repo or task root. reason: Hidden tests and reference patches are strictly isolated from the agent-visible repo tree.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] task.toml evidence: docker_image specified as golang:1.24-bookworm reason: Specifying a docker_image enables clean environment testing.
- [info] environment/repo/Dockerfile evidence: Multi-stage Dockerfile with builder and runtime stages to build and run kindling reason: Supports building and running the task in a clean container setup.
- [info] tests/test.sh evidence: runs tests/hidden/run_criteria.py on environment/repo reason: Executes the grading criteria in the packaged environment.
- [info] tests/grader/frontiercode.yaml evidence: All blocker criteria pass at the reference-fix calibration with high confidence reason: Indicates test correctness and validation of expected output schema.
