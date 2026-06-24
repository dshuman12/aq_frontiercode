# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__uri-short-escape

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt clearly states the user-facing task, constraints, and desired behavior without prescribing exact patching steps. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible workflow guidance in instruction.md aligns well with repo conventions and real maintainer workflow for testing, linting, and build commands, providing clear validation instructions without exposing hidden grader assets. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric in tests/grader/frontiercode.yaml covers mergeability comprehensively, including behavior correctness, regressions, mechanical cleanliness, tests, scope, and code quality. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric criteria have clear rationales, intentional blocker flags, and weights calibrated according to task risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blockers in tests/grader/frontiercode.yaml correspond to appropriate hard stops that maintainers would reject, ensuring that a patch failing any blocker criterion truly blocks merging. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task includes a calibrated reference fix patch and comprehensive tests for handling short escapes at string ends, preventing false positives from weak tests or rubric gaps. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The provided criteria and calibrations include an alternative_valid calibration referencing the source fix patch, demonstrating accepted valid solutions for the truncated escape error. The tests include coverage for short-escape cases and positive round-trips, ensuring valid variations are not rejected. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task requires adding tests for handling short percent-escape sequences, and the provided visible tests in internal/uri/uri_test.go include explicit coverage for truncated escapes and validate that such inputs return errors rather than panicking. The visible tests are linked and confirmed to fail on the base broken version, ensuring correctness and meaningful regression coverage per the criteria. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The scope controls are explicitly defined in the grader YAML with allowed_paths limited to internal/uri/ and its relevant files, plus thresholds on max_files and max_changed_lines, effectively constraining the patch scope. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, reference patches, or calibration data leak into the agent-visible files; the visible files contain no hidden tests or fix commit IDs. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task contains a proper Dockerfile setup, correct task.toml with a public network mode and golang base image, and a shell test script that runs the repository's tests via a Python helper script. The hidden grader setup includes a classical, blocker criterion run for the main regression tests and other criteria to ensure code scope and no hidden asset leaks. The source commit patch and regression tests are included, verifying the key fix and integration within the fresh environment. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The prompt describes the issue (percent-decoding mishandles truncated escapes) and specifies expected behavior (reject truncated escapes consistently with short-escape errors). It mandates keeping the existing decoder signature and error-reporting contract and limits changes to internal/uri. reason: Clear specification of expected behavior and constraints helps the user understand the goal without over-constraining the implementation approach.
- [info] instruction.md evidence: The prompt advises not to change behavior for valid escapes, plus handling, or non-escaped bytes. reason: This ensures the prompt focuses on the problem area without requiring unnecessary changes elsewhere.
- [info] instruction.md evidence: Test guidelines clearly instruct adding or extending tests for inputs ending with lone '%' or '%' plus one character, asserting correct error handling. reason: Test requirements align well with the described fix and ensure validation of the intended behavior.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guidelines specify `go test ./internal/uri/...` to validate, matching the usual Go test practice shown in CONTRIBUTING.md ('go test ./...') and in GitHub workflows. reason: Ensures visible test commands align with usual testing process and are sufficient to validate patch correctness.
- [info] instruction.md evidence: Lint guidelines instruct to run `go build ./...`, `go vet ./...`, and `gofmt -l internal/uri` before finishing, consistent with CONTRIBUTING.md and CI workflows that run 'go build', 'go vet', and 'go test'. reason: Visible lint and build instructions match real maintainer workflow ensuring agents can validate correctness and style.
- [info] instruction.md evidence: Style guideline mentions to branch from the provided snapshot without rebasing or switching to main, consistent with branch practices described in CONTRIBUTING.md under 'Branching'. reason: Clear style guidance helps maintain commit quality without exposing grader internals.
- [info] tests/test.sh evidence: The script runs a hidden criterion script `python3 tests/hidden/run_criteria.py` on the repo, consistent with grader criteria declared in tests/grader/frontiercode.yaml. reason: Shows integration of visible test script with hidden grading without exposing hidden assets.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include classical for hidden_reference_tests_pass, reverse_classical for submitted_tests_fail_on_base, command for visible_regression_tests_pass, and scope method with precise allowed paths reason: Using classical, reverse_classical, command, and scope methods addresses objective criteria for behavior correctness, regressions, code scope, and merge safety.
- [info] tests/grader/frontiercode.yaml evidence: Several patch_specific LLM-prompt criteria with thresholds cover behavior_core_requirement, edge_cases, error_handling, backward_compatibility, and test coverage. Additional criteria cover maintainability, dependency fit, and output contracts. reason: Subjective quality aspects and ensure code quality, maintainability, API stability, and test integration are covered.
- [info] tests/grader/frontiercode.yaml evidence: Scope limits patch to internal/uri/ directory and related test files, max 6 files and 250 changed lines reason: This protects from unrelated broad rewrites and enforces minimal and targeted patches.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags set for main correctness, scope, and asset leak criteria reason: Ensures blocking issues must be resolved for merge.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion includes a meaningful 'description' explaining why it matters (e.g., hidden reference tests verify patch correctness, scope matches reference intent to prevent unrelated changes). reason: Providing explicit rationale helps reviewers understand the importance of each criterion.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags align with critical risk areas; for example, hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak are all blockers. reason: Ensures that critical failures prevent acceptance, while lower-risk criteria remain non-blocking.
- [info] tests/grader/frontiercode.yaml evidence: Weights are mostly concentrated on major criteria (0.35, 0.20, 0.15, 0.15, 0.05) with patch-specific and behavioral criteria weighted lower (0.02 each). reason: Weight distribution reflects relative importance and expected impact on task quality.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blocker criteria include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak, each designed to catch true regressions or scope violations. reason: These criteria ensure that patches do not regress functionality, fail to fix the issue, break visible tests, or introduce unrelated or hidden sensitive artifacts, all being legitimate reasons to block a pull request merge.
- [info] tests/grader/calibration/reference.patch evidence: The reference-fix calibration sets a standard where passing all blockers signals a fully valid fix, and failing any corresponds to breakage or incorrect fixes. reason: This calibration verifies that the blockers align with a concrete example of a known good fix, confirming their role as true hard stop conditions.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/uri/uri.go evidence: Patch restricts percent-decoding to reject inputs where '%' is followed by fewer than two characters (i+2 >= len(s)). reason: This directly addresses the false positive risk of reading past string end without error.
- [info] internal/uri/uri_test.go evidence: Tests for truncated escapes like "%2" and lone "%" verify error returns and no panic. reason: Such negative tests ensure submitted solutions must properly detect and handle short escape sequences, blocking naive passes.
- [info] tests/grader/frontiercode.yaml evidence: Calibration includes no-op baseline failing key criteria and reference fix passing all, assuring sensitivity to correct behavior. reason: This calibration workflow ensures rubric cannot be gamed by trivial or partial fixes.
- [warn] adversarial-1 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [warn] adversarial-2 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [info] adversarial-3 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [warn] adversarial-4 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [info] adversarial-5 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Contains an alternative_valid calibration with a real source fix patch at tests/grader/calibration/reference.patch. reason: This calibration establishes a canonical valid solution baseline, securing against false negatives.
- [info] internal/uri/uri_test.go evidence: TestDecodeShortEscape checks that truncated escapes like "%2" produce errors instead of panics. reason: Tests cover relevant failure modes without over-specifying implementation details, allowing alternate valid implementations.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'test_coverage_negative_path' passed true with score 0.8 and 'test_coverage_positive_path' similarly passed. reason: Shows tests capture both error and success paths, supporting valid non-canonical solutions.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/uri/uri_test.go evidence: Tests include TestDecodeShortEscape which asserts that inputs like "%2" result in an error, capturing the short-escape failure case. reason: Ensures that truncated percent-escapes at input end are detected and error out appropriately as specified by the task.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'submitted_tests_fail_on_base' uses a reverse_classical method to confirm submitted visible tests fail against the original broken base commit. reason: Validates that the added tests meaningfully capture the buggy behavior and only pass after the fix, fulfilling the QA requirement for test correctness.
- [info] instruction.md evidence: The instructions explicitly require adding or extending tests for inputs ending with a lone % and % with a single character, asserting they trigger a short-escape error instead of panic. reason: Direct task mandate to add tests which is fulfilled by the provided internal/uri/uri_test.go.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope field specifies allowed_paths: ["internal/uri/", "internal/uri/uri.go", "internal/uri/uri_test.go"], max_files: 6, max_changed_lines: 250 reason: Explicit scope restrictions prevent unrelated file edits or broad diffs outside the URI decoding implementation and tests.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No grader prompts, test outputs, or hidden tests present, only task instructions. reason: Instruction files must not leak hidden grading information.
- [info] task.toml evidence: Contains only task metadata and environment config, no hidden tests or references. reason: Task config must not include grader or hidden test assets.
- [info] environment/repo/ evidence: Full repository files are standard project code and docs with no visible hidden grading tests or calibration patches. reason: Agent-visible repo must not contain hidden grader assets or reference patches.
- [info] No top-level solution folder evidence: No 'solution' folder found at top level. reason: Top-level solution folder is forbidden to prevent leaking solution code.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] task.toml evidence: Contains docker_image = "golang:1.24-bookworm" and network_mode = "public" reason: Defines a suitable fresh container environment consistent with the Go version required by the task.
- [info] environment/repo/Dockerfile evidence: Multi-stage build with Go 1.22 builder and Debian slim runtime, building the binary and setting ENTRYPOINT reason: Supports reproducible and clean packaging for both build and runtime environments.
- [info] tests/test.sh evidence: Runs python3 "$task_root/tests/hidden/run_criteria.py" with the repo path reason: Confirms test orchestration is in place and linked to hidden criteria which enforce test correctness.
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass as blockers with commands pointing to python3 runners reason: Ensures end-to-end testing including the base/broken state and final validation of fixes with correct blocking for core QA.
- [info] tests/grader/calibration/reference.patch evidence: Patch fixes boundary check from i+2 > len(s) to i+2 >= len(s) and adds a comprehensive uri_test.go reason: Contains the canonical fix and test coverage which validate the intended behavior and error conditions.
