# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__valueshape-ipv4

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt clearly states the user-facing request to fix the IPv4 octet range validation to include 255, without over-specifying implementation details, and aligns well with the reference source and test coverage requirements. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible workflow guidance in instruction.md aligns with the repository's real maintainer workflow, using correct and supported Go commands for testing, linting, and building. The visible test command is consistent with repo practices and sufficient to validate the task without exposing hidden grader assets. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | frontiercode.yaml rubric comprehensively covers mergeability aspects including correctness, regressions, scope, tests, and code quality, using appropriate classical, reverse_classical, command, and scope methods along with LLM prompts for subjective quality. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 0.90 | All rubric criteria have meaningful rationale descriptions, intentional blocker statuses, and weights that align with the task risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | The blockers in tests/grader/frontiercode.yaml properly enforce true hard stops reflected by the base vs fix commit and test results, preventing merging of patches with inadequate fixing of the IPv4 octet upper bound bug. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task includes a clear patch changing octet validation from n >= 255 to n > 255, and a test suite covering valid (255) and invalid (256) octet boundaries, preventing false positives. Calibrations confirm the patch fails on base and passes with the fix, confirming detection of incorrect logic. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The task includes alternative_valid calibrations referencing the source fix commit, which correctly relaxes IPv4 octet validation for 255. Tests in internal/valueshape/valueshape_test.go cover boundary cases, including 255 and above. The criteria guard against rejecting valid non-canonical solutions and ensure meaningful negative and positive coverage without overfitting to brittle implementation details. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task explicitly requires adding or extending tests to cover octets equal to 255 and boundary cases. The reference patch includes new tests in internal/valueshape/valueshape_test.go that cover valid 255 octets and invalid 256 octets, satisfying the requirement. The critical submitted_tests_fail_on_base criterion is passed with explicit reverse_classical evidence, confirming that these tests fail on the broken base and thus meaningfully capture the fix behavior. |
| 09_scope_controls Scope Controls | PASS | 1.00 | The task uses explicit, well-defined scope controls with allowed paths restricted to internal/valueshape/ and related files, with sensible limits on max files and changed lines, preventing unrelated or excessive changes. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 0.90 | No hidden grader assets, reference patches, or calibration files are exposed in agent-visible files or repo; no top-level solution folder is present. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task has a complete environment with a minimal Docker image, test integration via tests/test.sh, and a validated patch with extensive tests covering the boundary fix. The hidden grader confirms all critical criteria pass including end-to-end packaging and test integration. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The instruction.md specifies the core task is to fix the octet upper bound from ">= 255" to "> 255" to accept 255 octet, while preserving existing behavior and API. reason: It ensures that the prompt is concise and humanlike, focusing on the boundary fix for IPv4 octets without dictating patch strategy.
- [info] instruction.md evidence: The prompt instructs to keep exported classification API and return type intact and not to add broader classification (e.g., IPv6 or CIDR). reason: This avoids over-specification and unnecessary scope creep, keeping the task focused.
- [info] instruction.md evidence: Test guidelines call for adding or extending tests covering boundary octets 255 and 256, plus negative cases to prevent regression. reason: This clearly communicates the testing requirement without prescribing exact test code details.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Instruction.md specifies running 'go test ./internal/valueshape/...' for testing and 'go vet ./internal/valueshape/...' plus 'go build ./...' for lint and build. reason: These commands directly match those used in CONTRIBUTING.md for tests ('go test ./...'), vet ('go vet ./...'), and build ('go build ./...'), confirming aligned visible guidance.
- [info] environment/repo/CONTRIBUTING.md evidence: CONTRIBUTING.md specifies 'go build ./...', 'go test ./...', and 'go vet ./...' as local setup and verification commands. reason: This confirms that instruction.md commands are supported and known to maintainers and contributors.
- [info] tests/grader/frontiercode.yaml evidence: The visible regression test criterion uses the command 'go test ./internal/valueshape/...' matching the instruction.md advice. reason: Visible testing instructions provide enough information for agent validation without revealing hidden grader assets or commands.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden_reference_tests_pass (classical), submitted_tests_fail_on_base (reverse_classical), visible_regression_tests_pass (command), scope_matches_reference_intent (scope), and no_hidden_asset_leak (command) all blocker=true. reason: These criteria collectively ensure behavioral correctness, regression detection, patch scope control, and no leakage of hidden assets, which are key mergeability concerns.
- [info] tests/grader/frontiercode.yaml evidence: Additional criteria use llm_prompt method for subjective evaluation of behavior coverage (core requirement, edge cases, error handling, backward compatibility), test quality, integration, patch scoping, maintainability, dependency fit, and observable outputs. reason: Subjective LLM criteria cover nuanced quality aspects not captured by automated tests and enforce idiomatic, minimal, and backward-compatible changes.
- [info] tests/grader/frontiercode.yaml evidence: Allowed paths in scope criterion restrict patch to internal/valueshape files within reasonable limits (max files=6, max lines=250). reason: This prevents patch creep, ensuring submissions are focused and relevant to the task.
- [info] internal/valueshape/valueshape_test.go evidence: Visible tests present include positive classification cases and boundary rejection such as '999.0.0.1' not classified as IPv4. reason: Such test coverage demonstrates boundary condition checks and helps ensure that the patch fixes the off-by-one problem without regressions.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion includes a rationale description explaining its importance and expected verification method (e.g., hidden tests, scope checks, regression tests). reason: Clear rationale helps reviewers understand why each criterion matters for task correctness and quality.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags are set as true for core behavioral and scope criteria, false for lower-impact or subjective assessments. reason: Proper blocker assignment ensures critical failures block progress while minor issues do not.
- [info] tests/grader/frontiercode.yaml evidence: Weights range from 0.35 for most important hidden test criterion down to 0.02 for fine-grained maintainability and coverage facets. reason: This distribution reflects the task's primary risk (correct IPv4 detection fix) and secondary concerns (style, coverage).

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include 'hidden_reference_tests_pass', 'submitted_tests_fail_on_base', 'visible_regression_tests_pass', 'scope_matches_reference_intent', and 'no_hidden_asset_leak' with verified pass/fail states. reason: These criteria together ensure that broken base commits fail hidden tests, the submission fully fixes them, does not broaden patch scope or leak hidden assets, which corresponds to an actual hard stop a maintainer would reject.
- [info] tests/grader/calibration/reference.patch evidence: Reference patch applying the off-by-one fix, passing all blockers, sets a solid baseline for comparison. reason: This patch shows the expected correct fix scope and tests, showing the blockers align with a minimal true-blocking correctness standard rather than cosmetic or style concerns.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/valueshape/valueshape.go evidence: if err != nil || n < 0 || n >= 255 changed to n > 255 reason: This is the core logic fix for accepting 255 as a valid octet.
- [info] internal/valueshape/valueshape_test.go evidence: Test cases include addresses with octets 255 (255.255.255.0, 192.168.1.255) and 256 rejected reason: Test coverage explicitly exercises boundary conditions preventing false positives.
- [info] tests/grader/frontiercode.yaml evidence: calibrations include a no-op baseline failing hidden tests and a reference fix passing all criteria including hidden tests and scope reason: Calibration confirms tests detect both passing and failing implementations, preventing weak tests or rubric gaps.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-3 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-4 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Contains 'reference-fix' alternative_valid calibration with passed=true for all relevant criteria including hidden_reference_tests_pass and test_coverage_negative_path reason: Alternative valid calibrations ensure that solutions with corrected upper bound IPv4 octet validation (including 255) are accepted, avoiding false negatives.
- [info] internal/valueshape/valueshape_test.go evidence: Test cases include boundary inputs and explicitly check that '999.0.0.1' is not classified as IPv4, implying correct rejection above 255, and includes tests for typical IPv4 addresses reason: Presence of boundary tests with positive and negative values for octet limits ensures the fix is well tested and avoids brittle rejections.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/valueshape/valueshape_test.go evidence: Test file added with cases such as '255.255.255.0' and '192.168.1.255' classified as ShapeIPv4, and '256.0.0.1' classified as non-IPv4. reason: These tests verify acceptance of octets equal to 255 and rejection of 256, directly addressing the task requirement.
- [info] tests/grader/frontiercode.yaml evidence: submitted_tests_fail_on_base criterion uses method reverse_classical to confirm submitted tests fail on base, blocking and passed true. reason: This confirms the provided tests capture the intended behavior gap and fail on the broken base version, showing the tests' correctness and effectiveness.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Scope criterion 'scope_matches_reference_intent' defines allowed_paths including 'internal/valueshape/' and related go files, with max_files=6 and max_changed_lines=250. reason: Explicit scope constraints prevent expansive edits or unrelated file changes, ensuring patch relevance and minimal churn.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No hidden tests, grading prompts, or reference outputs found. reason: Instruction file only describes task and testing guidelines without exposing hidden grader info.
- [info] task.toml evidence: Simple task metadata, no hidden asset leakage. reason: Contains only public task configuration with no grader artifacts.
- [info] environment/repo/ evidence: No top-level solution folder; repo contains only normal source and tests. reason: Hidden test files and reference patches are only under tests/hidden and tests/grader, which are not agent-visible.
- [info] tests/ evidence: tests/grader and tests/hidden folders are not included in agent-visible repo and are not leaked. reason: Hidden grader assets and calibration patches are properly isolated and not leaked to the agent.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/Dockerfile evidence: Dockerfile uses a multi-stage build with golang 1.22 and debian bookworm slim, fits the Go 1.22+ requirement. reason: Ensures reproducible, minimal environment suitable for fresh container testing.
- [info] tests/test.sh evidence: The test script runs a Python script 'tests/hidden/run_criteria.py' on the environment/repo directory. reason: Integrates automated criteria testing, including visible and hidden test suites in a reproducible manner.
- [info] tests/grader/frontiercode.yaml evidence: Criteria explicitly include running tests on a fresh environment and checking outputs such as pass/fail, reward, blocker failures. reason: Metadata configures end-to-end testing including environment setup and visible plus hidden tests.
- [info] tests/grader/calibration/reference.patch evidence: Patch fixes the off-by-one boundary in IPv4 octet validation and adds new tests to valueshape_test.go covering edge cases. reason: This confirms the patch both builds and successfully passes the new coverage to fulfill the task objective.
- [info] environment/repo/internal/valueshape/valueshape.go evidence: Line with condition changed from 'n >= 255' to 'n > 255', correctly accepting '255' octets. reason: Core correctness fix requested in the task.
- [info] environment/repo/internal/valueshape/valueshape_test.go evidence: Tests include coverage of valid and invalid IPv4 addresses, including edge cases of 255 octets and invalid 256 octets. reason: Ensures the fixed behavior is properly verified in unit tests.
