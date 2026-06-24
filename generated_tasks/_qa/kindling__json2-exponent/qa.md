# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__json2-exponent

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt clearly states the user-facing request to fix the JSON number scanner to accept uppercase 'E' in exponents and includes explicit constraints without prescribing a detailed implementation approach. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible instruction.md commands for testing, linting, and style match the repo's documented and automated workflows, enabling proper validation without exposing hidden grader assets. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric in tests/grader/frontiercode.yaml covers mergeability comprehensively, addressing behavior, regressions, mechanical cleanliness, scope, and code quality through varied criteria and methods including classical, command, scope, and llm_prompt. It explicitly blocks merges on key quality and scope checks. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 0.90 | All rubric criteria in tests/grader/frontiercode.yaml have meaningful rationales, explicit blocker statuses consistent with their risk, and calibrated weights appropriate to task scope and impact. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blocker criteria in tests/grader/frontiercode.yaml represent valid hard stops that maintainers would legitimately reject during review, supported by calibration examples and explicit test commands. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task includes strong criteria verifying that submitted tests fail on the base broken repo and pass on the fixed repo, covering uppercase 'E' exponents parsing correctly. The visible regression tests and hidden reference tests ensure semantics are not bypassed, and scope rules restrict changes only to relevant files. The no-op calibration confirms weak or empty patches fail all key criteria. Adversarial probe: Adversarial agent did not find a candidate patch. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The task has a clear alternative_valid calibration using the source fix commit patch, which adds support for uppercase 'E' in exponent scanning. Visible tests exist and fail on the base snapshot but pass after the patch. Criteria coverage ensures the fix addresses the requested behavior without over-restrictive criteria rejecting valid implementations. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task requires adding or extending tests for uppercase 'E' exponent support in JSON numbers. The reference patch adds a comprehensive internal/json2/json2_test.go suite with relevant test coverage. The grader criterion 'submitted_tests_fail_on_base' confirms the added tests fail on the broken base commit and pass on the fixed version, validating test effectiveness. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The task explicitly defines a scope check using allowed_paths to limit changes to internal/json2/, internal/json2/json2.go, and internal/json2/json2_test.go, with limits on max_files and max_changed_lines, ensuring relevant and minimal patch scope. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | Inspection of agent-visible files shows no hidden grader assets, rubrics, reference test patches, or calibration patches leaked; the top-level solution folder is also absent. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task includes a Docker environment and a test script that runs tests in a fresh repo clone, using a Docker image golang:1.24-bookworm, consistent with the task requirement. The hidden grader confirms the patch from the source fix passes all required tests including behavior and scope-related criteria, and visible regression tests pass as well. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The instruction states the problem, the behavior to fix (accept uppercase 'E' as exponent marker), test requirements, lint and style guidelines, and scope constraints. reason: Clear problem description and requirements help users understand the task scope and expectations without over-specifying changes.
- [info] instruction.md evidence: "Do not alter exported names or function signatures, and confine changes to the number-scanning logic." reason: This imposes necessary constraints on the patch scope sensitively, without forcing exact patch strategies.
- [info] instruction.md evidence: The test guidelines ask to add tests for uppercase 'E' with various exponent forms and require passing existing tests. reason: It promotes humanlike, realistic task instructions covering desired test coverage without overly detailed step-by-step.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Instruction.md specifies 'go test ./internal/json2/...', 'go build ./...', 'go vet ./...', and 'gofmt -l internal/json2' to validate tests, build, vet, and formatting reason: These commands directly correspond to the repo's CONTRIBUTING.md local setup instructions and GitHub Actions ci.yml steps, confirming alignment with maintainer workflows.
- [info] environment/repo/CONTRIBUTING.md evidence: CONTRIBUTING.md includes 'go build ./...', 'go test ./...', and 'go vet ./...' as the local setup and testing workflow reason: Visible tests guidance matches documented project-level test and lint commands, ensuring contributors validate changes consistently.
- [info] tests/test.sh evidence: tests/test.sh runs hidden run_criteria.py on the repo to execute visible regression tests as defined by grader reason: This script bridges the visible repo and hidden grading infrastructure, but the visible instruction.md does not expose hidden grader commands, maintaining security and task integrity.
- [info] tests/grader/frontiercode.yaml evidence: The visible regression test criterion runs 'go test ./internal/json2/...' exactly as instructed in instruction.md reason: Ensures visible tests fully cover intended behavior and fit the maintainer's known workflow without exposing hidden tests or data.
- [info] instruction.md evidence: Lint checks include 'go build ./...', 'go vet ./...', and 'gofmt -l internal/json2' which is consistent with repo CI workflows reason: These lint requirements reflect the repo's CI steps, facilitating consistent contributor validation before submission.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include blocker checks using classical, reverse_classical, command, and scope methods targeting hidden tests, regression passes, scope minimality, and asset leaks reason: Ensures the submitted patch is behaviorally correct, properly scoped, and free from test or asset leaks.
- [info] tests/grader/frontiercode.yaml evidence: Patch-specific criteria using llm_prompt cover core requirement adherence, edge cases, error handling, backward compatibility, test coverage, scope minimality, idiomatic design, control flow simplicity, dependency fit, and observable output contracts reason: This subjective evaluation layer supplements objective tests to guard code quality and maintainability.
- [info] tests/grader/frontiercode.yaml evidence: Scope criteria restrict changes to internal/json2/ directory and related test files with limits on files and changed lines reason: Prevents unrelated rewrites or broad file churn that could affect mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Visible tests must fail against the base commit but pass after the fix, ensuring tests capture the behavior and regressions reason: Prevents acceptance of patches that do not implement or verify intended behavior fully.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each rubric item has a clear descriptive 'description' field explaining its importance. reason: Meaningful rationales help reviewers and contributors understand the purpose of each criterion.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags are set true for major criteria like hidden tests passing (weight 0.35), test coverage (0.2, 0.15), and asset leak (0.05), false for fine-grained patch-specific behavior prompts with small weights (0.02). reason: This distribution shows intentional risk assessment separating blocking from advisory criteria.
- [info] tests/grader/frontiercode.yaml evidence: Weights range from 0.35 for critical hidden reference test passing down to 0.02 for patch-specific behavioral subtleties, reflecting the task's priority on correctness and minimal scope patch. reason: Weight calibration reflects the practical importance and risk of each criterion relative to the overall task.
- [info] tests/grader/frontiercode.yaml evidence: Presence of detailed descriptions and calibrated weights across core and patch-specific criteria plus blocker flags. reason: This evidence supports structural manifest validity and QA completeness for this rubric.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak criteria, all with clear rationale and strong commands reason: Ensuring hidden tests pass after patch, that tests catch the bug in base and pass after fix, patch scope fits intent, and no hidden leakage are all valid hard stops to maintain quality and correctness
- [info] tests/grader/calibration/reference.patch evidence: The reference fix patch passes all blockers and exercises the key fix for uppercase-E number exponent reason: The calibration demonstrates that failure of blockers reflects patches that would break core task behavior or quality, confirming blocker validity

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/json2/json2.go evidence: Patch adds handling of uppercase 'E' alongside 'e' in number scanner, the exact feature requested reason: The critical feature fix is scoped narrowly to the number scanning logic.
- [info] internal/json2/json2_test.go evidence: New tests add coverage for numbers with uppercase 'E' and positive/negative exponents, enforcing equivalence to lowercase 'e' reason: Test cases cover the positive paths and boundary scenarios relevant to the fix.
- [info] tests/grader/frontiercode.yaml evidence: Criteria includes submitted_tests_fail_on_base that fails on original broken base and passes on patch, plus a hidden_reference_tests_pass blocker reason: Prevents weak solutions that do not actually fix uppercase 'E' exponent parsing from passing.
- [info] tests/grader/frontiercode.yaml evidence: Scope rules limit files to internal/json2/* ensuring unrelated changes are blocked reason: Minimizes risk of superficial passes due to unrelated patch changes.
- [info] tests/grader/calibration/reference.patch evidence: No-op 'hack' calibration is scored and fails the important criteria, verifying criteria effectiveness reason: Demonstrates the grader detects uncorrected base code behavior, preventing false positives.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-3 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-4 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Contains an alternative_valid calibration 'reference-fix' with a patch that adds 'E' to the accepted exponent characters reason: This calibration ensures that valid submissions that correctly handle uppercase 'E' exponents are accepted, preventing false negatives.
- [info] tests/grader/frontiercode.yaml evidence: Criteria includes submitted_tests_fail_on_base and visible_regression_tests_pass reason: This confirms the presence of tests that detect the original failure and validate the fix behavior, supporting resistance to false negatives.
- [info] internal/json2/json2_test.go evidence: New test file with tests presumably covering parsing including exponent cases reason: Presence of relevant tests covering uppercase exponent cases ensure valid non-canonical behavior is exercised and accepted.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/json2/json2_test.go evidence: A new file internal/json2/json2_test.go is added in the reference patch with multiple table-driven tests exercising JSON number decoding including edge cases. reason: This file contains the regression and positive path tests required by the task instruction to cover uppercase 'E' exponent cases.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'submitted_tests_fail_on_base' uses reverse_classical method to run tests and confirm they fail on the broken base commit, proving tests are meaningful. reason: Running visible tests against the base to catch the problem ensures tests validate the behavior rather than just passing trivially.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope key with allowed_paths ["internal/json2/", "internal/json2/json2.go", "internal/json2/json2_test.go"], max_files: 6, max_changed_lines: 330 reason: Explicit scope criteria prevent unrelated rewrites and excessive file churn.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No references or embedded hidden tests, patches, or rubrics. reason: Instructions should only provide task details and not leak hidden assets.
- [info] task.toml evidence: Contains only task metadata and docker image info without hidden test or grader references. reason: task.toml should be clean of grader artifacts.
- [info] environment/repo/ evidence: No hidden tests, grader materials, or calibration files detected in the repository files; structure matches expectations. reason: Agent-visible repo must be free of grading artifacts and hidden test files.
- [info] tests/ evidence: Hidden and grader files located only under tests/hidden/ and tests/grader/, not visible to agent; visible tests folder contains only test.sh reason: Hidden assets are correctly isolated from the visible agent workspace.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/repo/Dockerfile evidence: Dockerfile uses multi-stage to build and package a Go 1.22+ compatible static binary with debian slim runtime image reason: Ensures environment is reproducible and consistent with the Go version target and task requirements
- [info] tests/test.sh evidence: Test script sets strict mode, defines repo path relative to test folder, and runs tests/hidden/run_criteria.py with repo reason: This script is the entrypoint for running end-to-end tests including hidden (criteria) tests in a fresh environment
- [info] tests/grader/frontiercode.yaml evidence: Contains criteria for hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope matching, asset leak, as well as specific behavior and regression testing reason: Criteria and commands ensure both patch correctness, test integrity, and absence of contamination/asset leakage
- [info] tests/grader/calibration/reference.patch evidence: The patch adds support for uppercase 'E' in numbers, includes a new test file internal/json2/json2_test.go with comprehensive tests for coverage reason: This patch is the known valid fix, calibration shows the tests pass with it, fulfilling test coverage and integration requirements
- [info] task.toml evidence: Specifies docker_image = "golang:1.24-bookworm" consistent with required environment reason: Ensures task runs in a fresh container reproducing the environment for correct testing
- [info] instruction.md evidence: Instructions specify running go test ./internal/json2/... and confirm passing after patch, adding tests covering uppercase E exponents reason: Clear guidelines for testing coverage and behavior expected in the patch
