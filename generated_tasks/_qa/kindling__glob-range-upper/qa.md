# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__glob-range-upper

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The instruction.md clearly states the user-facing request and constraints without over-specifying how to implement the fix. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible instructions in instruction.md provide clear commands for testing, linting, and building that align well with the repository's documented workflows and supported tooling. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric comprehensively covers mergeability criteria including behavior, regressions, scope, mechanical quality, and tests with appropriate method classifications; it integrates classical and reverse_classical methods for objective checks and uses llm_prompt for nuanced subjective aspects. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric criteria have clear, meaningful rationales, explicitly stated blocker status, and well-calibrated weights corresponding to the task's risk and scope; evidence matches expected criteria structure and weights. |
| 05_blocker_validity Blocker Validity | PASS | 0.95 | Blocker criteria in tests/grader/frontiercode.yaml correspond to essential task correctness and quality gates, blocking merging if the submitted patch does not fix the range upper-bound matching bug or if the test coverage, regression, or scope requirements fail. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task includes robust hidden and visible tests validating correct inclusive range matching and regression against the base commit; scope and calibration prevent false positives. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The frontiercode.yaml includes an alternative_valid calibration with the exact source fix patch and comprehensive criteria results, including multiple tests and LLM prompt evaluations. The test suite includes a reference test file internal/glob/glob_test.go with coverage of the upper-bound matching behavior, ensuring false negatives are avoided. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task explicitly requires adding or extending tests to cover the upper bound range matching in glob patterns, and the criterion submitted_tests_fail_on_base confirms that submitted visible tests fail on the original broken base, implying meaningful test coverage. The visible regression tests in internal/glob/glob_test.go are integrated, meaningful, and validated to fail on the base and pass after the fix. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The task manifest includes explicit scope controls restricting patch changes to 'internal/glob/' and related files, with limits on max files and changed lines. This scope aligns with the source fix commit and test files, providing robust control against unrelated changes and excessive churn. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, rubrics, reference outputs, or calibration patches leak into agent-visible files or repository paths; no top-level solution folder is present. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task includes all necessary packaging files, a Dockerfile with a multi-stage build producing a runnable container, and a test shell script that runs tests in the expected environment. The FrontierCode grader configuration confirms passing criteria for end-to-end tests and environment compatibility. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The glob engine's range matching upper-bound is broken; fix must include upper-bound character in matches without altering public API or unrelated glob behavior. reason: Specifying the problem, required fix behavior, constraints on API unchanged, and testing guidelines ensures clarity and avoids overly constraining implementation.
- [info] instruction.md evidence: Do not alter the public matching API, pattern parsing, or * and ? glob behavior. reason: This avoids over-specification by limiting scope to the range membership test only, letting maintainers choose implementation approach.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guidelines: `go test ./internal/glob/...` matches testing guidance in CONTRIBUTING and matches the visible internal/glob/glob_test.go file. reason: The test command is consistent with the repo's testing setup and the visible test files; no unsupported or generic commands present.
- [info] instruction.md evidence: Lint guidelines: `go vet ./internal/glob/...` and `gofmt -l internal/glob` match the project tooling and are consistent with CONTRIBUTING instructions. reason: Visible lint steps conform to repo standards and are sufficient for style verification.
- [info] instruction.md evidence: Build guideline: `go build ./...` is recommended by CONTRIBUTING.md and is supported by the Go module layout in the repo. reason: Build commands in instructions match the repo's real maintainer workflow for Go projects.
- [info] instruction.md evidence: Instruction to create branch from the given snapshot without rebasing matches normal branching guidance from CONTRIBUTING.md. reason: Visible guidance provides agents enough context to validate changes without needing hidden grader data.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include classical, reverse_classical, command, and scope methods for behavioral and regression-related checks, ensuring coverage of correct behavior, regressions, and scope. reason: Classical and reverse_classical methods ensure objective test-based validation of behavior and regression capture, which are critical for mergeability.
- [info] tests/grader/frontiercode.yaml evidence: LLM prompt methods are used for subjective quality criteria such as idiomatic design, error handling, backward compatibility, and code quality. reason: Llm_prompt methods enable nuanced human-like evaluation for code quality and subtle behaviors not easily captured by automated tests.
- [info] tests/grader/frontiercode.yaml evidence: Scope criteria restrict changes to feature-relevant files with file and line caps, and no hidden asset leaks are enforced. reason: Limiting scope prevents unrelated or sprawling changes, which preserves maintainability and reduces review complexity.
- [info] tests/grader/frontiercode.yaml evidence: Visible regression tests pass and submitted tests fail on base to ensure tests exercise the fix and identify regressions clearly. reason: Regression detection and test meaningfulness promote confidence that the patch works as intended and does not mask regressions.
- [info] tests/grader/frontiercode.yaml evidence: Positive and negative path test coverage, integration with existing workflows, and no new dependencies are required. reason: This ensures robust coverage of new behavior, realistic edge cases, and smooth integration into the existing project setup.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion includes a rationale/description explaining importance, its blocker status is explicitly set (mostly true for critical criteria), and weights are diverse and correspond to task risk: e.g., main hidden tests (0.35), visible regression (0.20), scope (0.15), smaller patch-specific LLM checks (0.02 each). reason: Meaningful rationale clarifies scoring intent; blocker flags gate essential correctness; calibrated weights reflect test importance and task impact.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include: hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak reason: These criteria ensure the patch fixes the main bug (demonstrated by hidden tests passing and base failing), keeps regression tests passing, and restricts patch scope to the affected area—true hard stops for maintainers.
- [info] tests/grader/calibration/reference.patch evidence: Reference fix patch changes range membership from ch < upper bound to ch <= upper bound reason: This patch exemplifies the correct fix that should pass blocker tests, confirming the blocker criteria effectively discriminate between acceptable and unacceptable patches.
- [info] tests/grader/frontiercode.yaml (calibrations) evidence: Calibration shows no-op base fails blockers and reference fix passes all blocker criteria reason: This demonstrates blockers identify genuine breaking issues and do not block valid fixes, aligning with maintainer rejection criteria.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/glob/glob.go evidence: Patch changes 'if ch >= class[i] && ch < class[i+2]' to 'if ch >= class[i] && ch <= class[i+2]' reason: Fix targets inclusive upper bound matching precisely, avoiding broader behavioral changes.
- [info] internal/glob/glob_test.go evidence: Test cases explicitly test that '[a-z]' matches 'z', '[0-9]' matches '9', and ranges exclude out-of-range characters reason: Tests clearly check the core task fix and the edge boundary conditions.
- [info] tests/grader/frontiercode.yaml evidence: Blocker criteria include hidden_reference_tests_pass, submitted_tests_fail_on_base and visible_regression_tests_pass using the hidden tests and patterns reason: Enforces failure on base commit and pass only after proper fix, preventing weak tests or shortcuts.
- [info] tests/grader/calibration/reference.patch evidence: The official fix patch is included as a calibration alternative with all criteria passing reason: Provides a baseline for comparison and ensures task requirements are accurately tested.
- [info] adversarial-1 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [warn] adversarial-2 evidence: adversarial model call failed reason: Invalid control character at: line 6 column 136 (char 1137)
- [info] adversarial-3 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, no_hidden_asset_leak; score=0.375 reason: candidate did not clear the false-positive gate
- [info] adversarial-4 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-5 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: An alternative_valid calibration entry includes the source fix patch (calibration/reference.patch) and shows all relevant criteria passing, especially hidden_reference_tests_pass and submitted_tests_fail_on_base. reason: This shows acceptance of the known correct fix, allowing valid alternative solutions to not be rejected.
- [info] internal/glob/glob_test.go evidence: TestRangeClass tests the inclusive matching of characters within ranges but does not reject correct upper-bound matches. reason: The test directly exercises the upper-bound range matching and ensures regressions that exclude upper bound are caught, avoiding false negatives.
- [info] tests/grader/frontiercode.yaml evidence: Criteria includes behavioral prompts that evaluate edge cases and backward compatibility, helping catch overly prescriptive or brittle requirements. reason: LLM prompts help validate implementation flexibility and avoid false negative rejection by focusing on behavior rather than brittle syntax.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/glob/glob_test.go evidence: The new test file internal/glob/glob_test.go contains multiple table-driven tests covering character classes including ranges, e.g., TestRangeClass covering '[a-z]' with verification of range membership. reason: The presence of comprehensive tests exercising the range inclusive behavior is essential for verifying the fix.
- [info] tests/grader/frontiercode.yaml evidence: 'submitted_tests_fail_on_base' criterion uses a reverse_classical method with a command that runs tests and ensures they fail on the broken base commit 33728f6aadff6ecd6fcadd242e23f9f685d7451f reason: This validates that submitted tests meaningfully detect the brokenness in the base version, confirming the tests' correctness and relevance.
- [info] tests/grader/frontiercode.yaml evidence: 'visible_regression_tests_pass' criterion runs tests in internal/glob and passes on the fixed version. reason: Confirms the new or extended tests are integrated correctly and pass once the fix is applied, verifying regression coverage.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope: allowed_paths: ["internal/glob/", "internal/glob/glob.go", "internal/glob/glob_test.go"] max_files: 6 max_changed_lines: 288 reason: Explicit patch scope criteria prevent unrelated rewrites, limiting the diff to relevant paths and size.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No grader assets or hidden tests found in instruction.md reason: Instruction file should not expose any hidden test or grading material.
- [info] task.toml evidence: task.toml contains only general task metadata, no test or grading assets reason: Task manifest must not leak hidden test details or grading prompts.
- [info] environment/repo/ evidence: environment/repo contains normal source and integration code, no hidden tests or grader artifacts reason: Agent-visible repo must not contain hidden grader assets or test references.
- [info] tests/ evidence: Hidden grader assets and tests are under tests/grader/ and tests/hidden/, not in agent-visible files or repo reason: Hidden assets separation ensures no leakage to solution or user-visible environment.
- [info] top-level solution folder evidence: No top-level solution folder or similar folder with solution files detected in task root reason: Presence of top-level solution folder would expose hidden solution info to the agent.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/Dockerfile evidence: Multi-stage Dockerfile builds the binary with golang:1.22 and runs in debian:bookworm-slim with correct user setup reason: Verifies correct container image creation including build and runtime, essential for packaging.
- [info] tests/test.sh evidence: Script runs with sh -eu, sets task root, and runs python3 tests/hidden/run_criteria.py on environment/repo reason: Shows explicit test invocation that works inside the packaged repo environment.
- [info] tests/grader/frontiercode.yaml evidence: Contains multiple blocking criteria including hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass all passing on the reference fix reason: Demonstrates passing grading criteria and correctness of patch in packed environment.
- [info] task.toml evidence: Specifies docker_image = "golang:1.24-bookworm" with network_mode public reason: Defines container base image and network mode to run task in a fresh containerized environment.
