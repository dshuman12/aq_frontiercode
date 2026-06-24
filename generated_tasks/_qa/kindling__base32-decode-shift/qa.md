# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__base32-decode-shift

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt is clear, concise, humanlike, and focuses on the user-facing request without over-specifying the implementation details. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.95 | The visible instruction.md test and lint guidance accurately reflects the actual repository workflow and test commands, providing clear, supported commands to validate the patch without revealing hidden grader assets. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The grader config covers mergeability well by including classical, reverse_classical, command, and scope methods for key criteria such as behavior correctness, regression prevention, scope adherence, and lack of hidden asset leaks. It also uses LLM prompt scoring for subjective quality aspects like edge cases, maintainability, and integration with test workflows. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric criteria have clear rationales, intended blocker status, and weights that align well with the task's risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | The blockers defined in tests/grader/frontiercode.yaml correspond well to genuine hard stops for a maintainer; failure to pass these would indicate critical issues with correctness, tests, scope, or leakage that justify rejection. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.95 | The hidden test suite includes a strong reference test that verifies round-trip encoding and decoding across input lengths and binary values, effectively preventing false positives. Calibration includes a no-op baseline that fails these tests, confirming their strength. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The reference calibration includes a valid patch fixing the bit-offset arithmetic and comprehensive tests covering round-trip encode/decode for various input lengths and error cases. The frontiercode.yaml criteria and calibration data confirm acceptance of alternative valid solutions with proper test coverage and no overly prescriptive criteria. |
| 08_agent_tests Agent Test Correctness | PASS | 0.95 | The task explicitly requires adding or extending tests in internal/base32 to cover round-trip encode/decode with all padding cases and asserts correct decoding. The hidden grader confirms that submitted tests fail against the broken base (reverse_classical criterion) and pass against the fix, validating their meaningfulness and correctness. |
| 09_scope_controls Scope Controls | PASS | 1.00 | The task includes explicit and appropriate scope controls using allowed_paths with paths limited to internal/base32/, internal/base32/base32.go, and internal/base32/base32_test.go, restricting changes to relevant code and tests. Limits on max_files and max_changed_lines further constrain the patch size, ensuring focused edits. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, tests, calibration patches, or reference materials appear in the agent-visible files or repo directories. The visible repo tree and task files contain no hidden test code or grading artifacts. |
| 11_packaging_e2e End To End Packaging | PASS | 1.00 | Task packaging passes an end-to-end test cycle, including environment Docker setup and visible test scripts, verified by a complete classical and LLM-based QA calibration with hidden tests. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: The instruction explains the bug (off-by-one bit shift in decoding), the expected fix (correct bit-offset arithmetic), and constraints (no API changes, no new deps, tests for round-trip correctness, keep padding and encoding stable). reason: Clearly states the problem, required fix, constraints, and testing guidelines in plain language without prescribing exact patch strategies.
- [info] instruction.md evidence: The prompt avoids prescribing an exact patch strategy and allows implementers to fix the shift arithmetic as needed. reason: Avoiding prescriptive solution details ensures the prompt is implementation-agnostic and suitable for multiple valid solutions.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Instruction.md specifies running 'go test ./internal/base32/...' for validation and using 'go vet ./internal/base32/...' and 'go build ./...' for lint and build checks. reason: This matches the documented testing and build commands in CONTRIBUTING.md and the visible CI workflows in .github/workflows/ci.yml which run 'go vet ./...' and 'go test ./...'.
- [info] environment/repo/CONTRIBUTING.md evidence: CONTRIBUTING.md instructs to run 'go build ./...' and 'go test ./...' as standard developer validation steps. reason: Confirms that the instruction.md visible test guidance aligns with usual maintainer workflow.
- [info] tests/grader/frontiercode.yaml evidence: Visible test commands use 'go test ./internal/base32/...', consistent with instruction.md guidance, and no hidden grader commands are exposed directly. reason: Ensures agents have sufficient visible guidance to validate without hidden grader dependencies.
- [info] tests/test.sh evidence: Script calls 'python3 tests/hidden/run_criteria.py' but this is a hidden utility not exposed in instructions; instructions only expose Go test, vet, build commands. reason: Ensures visible guidance does not leak hidden grader or test assets.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include classical for hidden_reference_tests_pass, reverse_classical for submitted_tests_fail_on_base, command for visible_regression_tests_pass, scope for patch scope and max changed lines reason: These objective methods enforce that the patch fixes the behavior, tests regressions, and stays focused within allowed files and line changes.
- [info] tests/grader/frontiercode.yaml evidence: LLM prompt-based criteria for behavior_core_requirement, behavior_edge_cases, backward compatibility, and regression test meaningfulness reason: These subjective measures complement objective checks by evaluating code quality, coverage depth, error handling, and backward compatibility.
- [info] tests/grader/frontiercode.yaml evidence: Coverage extends to test integration, scope minimality, public API immutability, idiomatic design, simple control flow, and dependency/environment fit reason: Full rubric coverage to prevent regressions, non-functional issues, or unrelated changes.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion has a description explaining why it matters and a blocker boolean set intentionally. reason: Clear descriptions help reviewers understand the importance of each criterion; blocker flags align with critical checks like hidden tests passing and scope fidelity.
- [info] tests/grader/frontiercode.yaml evidence: Critical criteria such as 'hidden_reference_tests_pass' have the highest weight 0.35 and are blockers, while smaller criteria have low weight 0.02 and non-blocker status. reason: This weighting properly reflects the task risks, focusing on behavioral correctness and scope, while auxiliary criteria have minor impact.
- [info] tests/grader/frontiercode.yaml evidence: Calibrations (no-op base and reference fix) confirm the criteria collectively capture intended task scope and correctness. reason: Calibrations provide evidence that weights and blocker statuses calibrate well relative to task difficulty and validation rigor.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak reason: These criteria block patch merging because failing them means the patch doesn't fix the bug, doesn't include tests that fail on the faulty base, regresses existing tests, changes unrelated code, or leaks hidden assets.
- [info] tests/grader/frontiercode.yaml evidence: The hidden_reference_tests_pass runs hidden tests extracted from the source fix's tests at internal/base32/base32_test.go verifying behavioral correctness. reason: This ensures that any patch must fully fix the decoding bit-shift error, preventing silent acceptance of partial or no fixes.
- [info] tests/grader/frontiercode.yaml evidence: The submitted_tests_fail_on_base criteria confirm that submitted visible tests fail on the original broken base snapshot. reason: This guarantees that tests actually capture the defect and that the patch corrects it, thereby being a true blocking functional correctness check.
- [info] tests/grader/frontiercode.yaml evidence: scope_matches_reference_intent enforces patch scope to internal/base32/ and limits lines and files changed. reason: This prevents acceptance of unrelated changes that could mask the root cause or hide regressions, acting as a quality gate.
- [info] tests/grader/frontiercode.yaml evidence: no_hidden_asset_leak ensures the repository does not contain grader assets, reference patches, or fix commit identifiers visible to the agent. reason: This blocks patches leaking confidential data or automated grader info, a security and integrity requirement.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/base32/base32_test.go evidence: TestRoundTrip tests all input lengths from 0 to 49 bytes with varying binary data, asserting decoded output matches the original input exactly. reason: This comprehensive test prevents solutions that do not properly fix the bit-offset error from passing, closing typical shortcut exploits that rely on weak or narrow tests.
- [info] tests/grader/frontiercode.yaml evidence: The 'submitted_tests_fail_on_base' criterion ensures tests fail on the broken baseline, and 'hidden_reference_tests_pass' requires passing the hidden tests derived from reference fixes. reason: This guarantees visible tests capture the core bug and prevent incomplete or incorrect submissions from passing.
- [info] tests/grader/calibration/reference.patch evidence: The included fix patch changes the decode bit shift from 33-k*8 to 32-k*8, matching the task's bug description exactly. reason: Reference calibration validates that the tests detect this precise fix, ensuring solutions must implement a similarly correct shift.
- [info] adversarial-1 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-2 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-3 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-4 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-5 evidence: model did not return a patch reason: no adversarial candidate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: alternative_valid calibration 'reference-fix' provides patch and passing criteria including round-trip and error case tests reason: This calibration shows that the grader accepts valid alternative fixes without rejecting due to brittle details.
- [info] internal/base32/base32_test.go (in calibration patch) evidence: tests include round-trip encoding/decoding for inputs of length 0 to 49 bytes, tests for bad length error, and tests for invalid character error reason: These tests ensure multiple valid implementations are unlikely to be falsely rejected and that key behaviors, including edge cases, are tested.
- [info] tests/grader/frontiercode.yaml.Criteria evidence: criteria avoid overfit by including LLM prompt evaluations and classical criteria with accepted thresholds; no requirement to reproduce the exact reference patch reason: This design resists brittle test failures on valid non-canonical solutions while enforcing task correctness robustly.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/base32/base32_test.go evidence: Test file added with TestEmpty, TestSingleByte, TestRoundTrip (encode then decode every length 0-49), and decode error cases. reason: This test file targets the precise failure mode described and includes positive and negative path coverage, fulfilling the task's explicit test guidelines.
- [info] tests/grader/frontiercode.yaml evidence: submitted_tests_fail_on_base criterion uses reverse_classical method with a command that runs run_criteria.py to confirm that submitted visible tests fail on base and pass on fix. reason: This criterion confirms that the agent-submitted tests meaningfully detect the broken base behavior and validate the patch, ensuring test correctness by direct execution comparison.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope: allowed_paths: ["internal/base32/", "internal/base32/base32.go", "internal/base32/base32_test.go"] max_files: 6 max_changed_lines: 250 reason: Explicit scope controls ensure the patch only touches relevant files and limits excessive code churn, matching the source fix intent.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No hidden test code, grader prompts, reference outputs, or patch artifacts visible. reason: Instruction file only contains task description and guidelines without any grader or test contents.
- [info] task.toml evidence: Contains only task metadata (name, description, docker image) with no grading assets or hidden tests. reason: The task manifest is clean and suitable for agent exposure.
- [info] environment/repo/ evidence: No grader assets, hidden tests, or reference patches. Visible repo tree matches expected project structure without top-level solution folder. reason: Agent repo subdirectory is free of hidden grader or test artifacts.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] task.toml evidence: Defined docker_image = "golang:1.24-bookworm", network_mode set to public reason: Specifies a clean, standard Go environment ensuring a fresh container can be built and run.
- [info] environment/repo/Dockerfile evidence: Multi-stage Dockerfile building a Go 1.22 binary, then a minimal Debian runtime container reason: Provides reproducible, minimal container images suitable for fresh test runs consistent with the declared environment.
- [info] tests/test.sh evidence: Script runs a Python criteria runner against environment/repo to validate tests reason: Ensures the testing process is automated and does not assume pre-installed dependencies outside the container.
- [info] tests/grader/frontiercode.yaml evidence: Includes multiple classical and LLM-based criteria including running tests inside the container environment reason: Shows the task is verified end-to-end for correctness, regression, scope, and style in a fresh environment.
- [info] tests/grader/calibration/reference.patch evidence: Reference patch is included and used for comprehensive classical hidden tests with blocking criteria reason: Indicates stable behavioral correctness verification integrated in the packaging.
