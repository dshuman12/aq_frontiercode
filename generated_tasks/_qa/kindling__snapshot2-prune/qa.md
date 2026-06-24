# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__snapshot2-prune

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The instruction.md clearly states the user-facing request to fix the snapshot pruning logic by correcting the age comparison, preserving boundaries, and not altering unrelated behaviors or APIs. It avoids over-specifying the patch implementation details, allowing natural fix strategies. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | The visible instruction.md commands for testing, linting, and build guidance align well with the repository's actual workflows documented in README.md and CONTRIBUTING.md, and match the visible tests under internal/snapshot2 as expected. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The rubric in tests/grader/frontiercode.yaml covers both correctness and mergeability aspects, using classical, reverse_classical, command, and scope methods objectively, supplemented by LLM subjective prompts for quality and behavior criteria. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 0.90 | All rubric criteria have clear rationales explaining their importance, blockers are properly set for critical criteria, and weights align reasonably with task risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All configured blockers correspond to true hard stops for the task, as they cover critical behaviors that the maintainer would reject if failing, with clear calibration evidence from base and reference-fix results. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task's test suite and calibration include comprehensive coverage of pruning logic, boundary cases, and regression detection, preventing false positives from shortcut solutions. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The frontiercode.yaml contains a calibration patch with a clean fix of the age comparison and extensive tests verifying correct pruning behavior, including edge and boundary cases. The provided valid solution and tests cover alternative valid implementations without over-restrictive criteria. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task clearly requires adding or extending tests for pruning behavior in internal/snapshot2, and the provided tests in internal/snapshot2/snapshot2_test.go cover correct pruning behavior with time-based retention logic. The hidden reference tests explicitly include checks for the pruning logic corrected in the fix, and the reverse_classical criterion confirms that submitted tests fail on the original broken code, evidencing meaningful coverage. |
| 09_scope_controls Scope Controls | PASS | 1.00 | The task enforces explicit and appropriate scope controls limiting changes to internal/snapshot2 directory files, with allowed_paths and sensible file and line change limits defined. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader artifacts, tests, reference patches, rubrics, or calibration materials leak into the agent-visible files or environment/repo directory; the hidden assets are properly isolated. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task packages a fresh environment with a suitable Dockerfile, a test script that runs hidden tests, and completes all required criteria including functional and integration tests, verified by the successful hidden grader calibration results. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: Prompt states: 'Correct the pruning logic so that a snapshot is removed only when its age strictly exceeds the retention window... Preserve existing behavior for boundary cases... keep function signature, return values, and ordering unchanged. Do not alter unrelated parts.' reason: This ensures the core user request and constraints are clear without forcing specific code changes.
- [info] instruction.md evidence: Test guidelines focus on coverage of behavior (older snapshots pruned, younger retained, boundary case preserved) without prescribing exact test code or patch structure. reason: This supports a concise and humanlike prompt by specifying what is tested, not how.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guideline: 'Run `go test ./internal/snapshot2/...` and confirm all tests pass.' matches README.md and CONTRIBUTING.md recommended workflows to use `go test ./...` and per-package tests; the visible tests in internal/snapshot2/ are present. reason: Ensures visible tests recommended for validation are consistent with the repo's structure and common workflows.
- [info] instruction.md evidence: Lint guideline: 'Run `go vet ./internal/snapshot2/...` and `go build ./...` before finishing' aligns with CONTRIBUTING.md instructions to `go vet ./...` and `go build ./...`. reason: Lint/build instructions are accurate and supported by existing repo tooling and CI workflows.
- [info] instruction.md evidence: No unsupported or generic commands appear in testing or lint requirements; all commands correspond to standard Go tools well supported by the repository. reason: Avoids confusion or disruption from unsupported commands in visible instructions.
- [info] tests/test.sh evidence: Test shell script calls a hidden runner script to run criteria, ensuring the visible test suite can be executed in the task environment. reason: This script bridges visible and hidden test assets without leaking graders; visible instructions suffice for validation.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden_reference_tests_pass (classical), submitted_tests_fail_on_base (reverse_classical), visible_regression_tests_pass (command), and scope_matches_reference_intent (scope). reason: Using multiple method types ensures objective coverage of patch behavior, regressions, and scope.
- [info] tests/grader/frontiercode.yaml evidence: Numerous patch-specific checks use llm_prompt with defined thresholds for behavior, edge cases, error handling, backward compatibility, regression quality, test coverage, and maintainability. reason: Subjective quality criteria via LLM augment objective checks to cover mechanical cleanliness and code quality.
- [info] tests/grader/frontiercode.yaml evidence: Scope control limits changes to internal/snapshot2/ and key files with max files and changed lines constraints. reason: Scope criteria enforce minimal and relevant patch area, preventing unrelated edits.
- [info] tests/grader/frontiercode.yaml evidence: No_hidden_asset_leak command ensures no grader or hidden assets leak into the public repo. reason: Prevents hidden test pollution, maintaining clean visible codebase.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion has a meaningful description explaining why it matters, e.g., 'Hidden behavioral tests extracted from the source fix pass after the submitted patch.' reason: Meaningful rationales guide reviewers and LLM scorers on what to focus and why.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags are set to true only for essential criteria like hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, and scope_matches_reference_intent. reason: Ensures that critical failures block acceptance while allowing lower-risk criteria to be non-blockers.
- [info] tests/grader/frontiercode.yaml evidence: Weights for blocking criteria are high (0.35, 0.20, 0.15, 0.15) reflecting their importance, while non-blockers have small weights (0.02) appropriately scaled for patch quality concerns. reason: Weight calibration reflects logical prioritization of different QA risks.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers such as hidden_reference_tests_pass and submitted_tests_fail_on_base enforce that tests fail on the broken base code and pass on the fixed code. reason: These blockers ensure the patch correctness is strictly validated before acceptance.
- [info] tests/grader/frontiercode.yaml evidence: scope_matches_reference_intent enforces patch scope confinement to relevant files. reason: Maintainers need to reject patches outside the intended functional area to avoid unrelated changes.
- [info] tests/grader/frontiercode.yaml evidence: visible_regression_tests_pass enforces the task's visible regression tests continue to pass post-patch. reason: Ensures no regressions or breakages that a maintainer would consider grounds for rejection.
- [info] tests/grader/frontiercode.yaml evidence: no_hidden_asset_leak confirms no grader assets or hidden tests leak into the visible repo. reason: Maintainers reject patches that expose hidden test data or grader internals.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/snapshot2/snapshot2.go evidence: The patch changes the pruning condition from 'now.Sub(manifest.Created) < retention' to 'now.Sub(manifest.Created) > retention'. reason: This directly fixes the inverted condition causing incorrect pruning, forcing proper logic in any correct submission.
- [info] internal/snapshot2/snapshot2_test.go evidence: Tests verify pruning removes snapshots older than the retention window only, preserves snapshots at the boundary, and maintain original order. reason: The existence of these tests blocks simple shortcut hacks that do not correctly implement the logic.
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden reference tests that fail on base but pass on fix, scope rules limiting patch to relevant files, and hack calibration that fails hidden tests without the fix. reason: Hidden tests with strong criteria and scope enforcement mitigate false acceptances by weak patches or partial edits.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-3 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-4 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Calibration includes a reference fix patch that changes pruning condition to if now.Sub(manifest.Created) > retention and comprehensive tests in internal/snapshot2/snapshot2_test.go reason: This demonstrates allowance for correct alternative implementations and tests verifying snapshots older than retention are pruned and snapshots within retention are kept as required.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'hidden_reference_tests_pass' requires passing tests from internal/snapshot2/snapshot2_test.go reason: Ensures that tests allow for valid fixes including the referenced alternative without brittle constraints.
- [info] tests/grader/frontiercode.yaml evidence: No criteria explicitly restricts implementations to a single exact comparison logic beyond verifying the age comparison is fixed. reason: This avoids unnecessarily rejecting valid non-canonical fixes or test coverage approaches.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/snapshot2/snapshot2_test.go evidence: Tests such as TestPrune simulate time and validate that snapshots older than the retention duration are removed, and those within are kept. reason: These tests directly exercise the corrected logic, ensuring pruning behavior is verified.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'submitted_tests_fail_on_base' uses reverse_classical method to confirm visible tests fail against the original broken base, indicating the tests capture behavior changes. reason: This validates that agent-written visible tests meaningfully detect the buggy pruning comparison.
- [info] instruction.md evidence: Test guidelines instruct adding or extending tests in internal/snapshot2 to cover corrected pruning behavior including boundary and mixed age snapshots. reason: The task explicitly requires relevant test additions to ensure the fix is thoroughly verified.

### 09_scope_controls Scope Controls

Findings:
- [info] internal/snapshot2/ evidence: Scope criteria specify allowed_paths: ["internal/snapshot2/", "internal/snapshot2/snapshot2.go", "internal/snapshot2/snapshot2_test.go"], max_files: 6, max_changed_lines: 348 reason: Explicit scope controls prevent unrelated rewrites and limit patch size, ensuring task focused changes within snapshot2 code and tests.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No hidden tests, grader prompts, calibration data, or reference outputs - contains only task specification and test/lint/style guidelines. reason: The instruction file is fully visible and does not expose hidden grader logic or assets.
- [info] task.toml evidence: No hidden assets or grader references; task metadata only. reason: Task manifest must not leak hidden grader assets.
- [info] environment/repo/ evidence: Environment directory contains only source code, docs, CI workflows, and project files; no calibrations, hidden tests, or grader assets found here. reason: Hidden grader assets must not appear in the agent-visible repo path.
- [info] tests/hidden/ evidence: Hidden tests, reference patches, and grader files exist exclusively under tests/hidden and tests/grader, which are not agent-accessible. reason: Grader and fix commit artifacts are properly isolated from the agent.
- [info] tests/grader/calibration/reference.patch evidence: Reference patch file is under tests/grader/calibration, inaccessible to agent. reason: Reference patches must stay hidden from the agent to preserve grading integrity.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] task.toml evidence: docker_image = "golang:1.24-bookworm" set, indicating a fresh Docker environment for testing reason: This ensures the task runs in a clean, consistent Go environment on Harbor or equivalent.
- [info] environment/repo/Dockerfile evidence: Multi-stage Dockerfile with builder and runtime stages for building and running a static binary reason: Provides a reproducible build and runtime in a standardized container image.
- [info] tests/test.sh evidence: Script invokes hidden criteria tests using python3 tests/hidden/run_criteria.py on environment/repo reason: Automates criteria evaluation and test execution in the container.
- [info] tests/grader/frontiercode.yaml evidence: Includes multiple blocking criteria for visible + hidden tests, scope checks, asset leak checks, and behavioral LLM prompting reason: Comprehensive validation covering patch correctness and environment integration.
- [info] tests/grader/calibration/reference.patch evidence: Reference fix patch included and tested to confirm task correctness with passing criteria results reason: Confirms the patch fixes the issue and tests run successfully reproducibly.
