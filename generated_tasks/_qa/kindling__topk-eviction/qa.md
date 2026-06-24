# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__topk-eviction

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The prompt clearly states the user-facing fix request and testing requirements without prescribing implementation details or patch strategy. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | The instruction.md testing and lint commands match the repo's visible workflow and README conventions, providing sufficient guidance for validation without exposing hidden grader assets. |
| 03_rubric_coverage Rubric Coverage | PASS | 1.00 | The rubric in tests/grader/frontiercode.yaml covers mergeability comprehensively, including correctness, regressions, scope, code quality, and tests integration. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric criteria include meaningful rationales and blocker statuses are clearly intentional with weights suitably calibrated for task risk and scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | Blockers in tests/grader/frontiercode.yaml align with meaningful failure criteria and reject patches missing the core fix, ensuring only correct patches pass. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The task features a focused fix to stable minimum eviction on ties, with an adequate visible test suite in internal/topk/topk_test.go covering eviction behavior including ties. Hidden behavioral tests replicate the source patch tests and fail on the broken base, strongly confirming resistance to false positives or weak rubric gaps. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The reference patch fully addresses the false-negative resistance by fixing minimum selection for eviction, confirmed by comprehensive hidden reference tests and visible tests. The test suite includes coverage for tie-breaking eviction behavior and ensures stability across input orders without being overly prescriptive. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task requires adding or extending tests for eviction behavior with tied counts. The visible submitted tests in internal/topk/topk_test.go include meaningful cases that cover eviction with tied minimum counts, and the grading config explicitly validates that these tests fail on the broken base. Thus, the tests correctly capture the desired behavior and are integrated and meaningful. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The task specifies explicit scope controls restricting modifications to 'internal/topk/', 'internal/topk/topk.go', and 'internal/topk/topk_test.go', with reasonable limits on files and lines changed, effectively preventing unrelated rewrites and churn. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 0.90 | No hidden grader assets, rubrics, or reference patches leak in the agent-visible files; no top-level solution folder is present. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task packaging is well-covered with a proper Docker container setup, test scripts, and a deterministic grading configuration. The container image builds with minimal dependencies, the test.sh script executes the key validation steps in a fresh environment, and the grader metadata confirms passing of critical criteria including patch scope, test coverage, and behavior correctness. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: Fix the minimum-selection logic so the intended victim—the first slot that reaches the minimum count during the scan—is the one replaced. Ties must not move the victim forward, and eviction results must be stable regardless of input ordering that produces equal counts. reason: This clearly articulates the core fix without over-specifying how to implement it.
- [info] instruction.md evidence: Keep the existing exported API, types, and method signatures unchanged; only the internal eviction decision should change. reason: Requirement to preserve public API is stated clearly and concisely.
- [info] instruction.md evidence: Run `go test ./internal/topk/...` to validate the change. Add or extend tests under `internal/topk` covering the full-set eviction path with tied minimum counts, asserting that the first minimal slot is evicted and that the resulting top-k contents stay stable across different insertion orders. reason: Test requirements are clearly communicated from the user's perspective.
- [info] instruction.md evidence: Behavior for the non-full case and for clearly distinct (untied) counts must remain identical. reason: Constraint to avoid changing unrelated behavior is clearly stated.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guideline: 'Run `go test ./internal/topk/...` to validate the change.' matches repo's README test command recommendation and the go test commands seen in GitHub workflows. reason: Ensures agents have accurate visible commands to run meaningful tests consistent with maintainer workflow.
- [info] instruction.md evidence: Lint guideline: 'Run `go vet ./internal/topk/...` and `go build ./...` and ensure no new warnings.' aligns with GitHub Actions 'go vet ./...' and 'go build ./...' steps. reason: Visible lint guidance is supported by the repo's CI workflows ensuring maintainers will catch lint and build issues.
- [info] instruction.md evidence: Style guideline specifies to branch from current snapshot without rebasing, matching typical project branching guidelines seen in CONTRIBUTING.md. reason: Provides clear style management instructions consistent with real project practices.
- [info] tests/test.sh evidence: Test harness runs a private run_criteria.py script to validate the repo and patch but instruction.md does not expose hidden grading assets or commands. reason: Visible guidance enables independent validation without leakage of hidden grader logic.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden_reference_tests_pass (behavioral correctness on hidden test), submitted_tests_fail_on_base (tests catch the bug on base), visible_regression_tests_pass (regression prevention), scope_matches_reference_intent (patch scope), and no_hidden_asset_leak. reason: These criteria ensure correctness, test coverage (positive and negative), regression prevention, and patch scope validating mergeability beyond just correctness.
- [info] tests/grader/frontiercode.yaml evidence: Patch-specific criteria use llm_prompt methods to check core behavior accuracy, edge cases, error handling, backward compatibility, test meaning, integration with repo workflow, and maintainability aspects like idiomatic design and simplicity. reason: Subjective LLM-based prompts supplement objective tests and cover important quality and quality-of-implementation aspects essential for mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Scope constraints restrict changed files and lines to targeted internal/topk/ directories, preventing unrelated churn. reason: Scope control is key to clean merges and avoiding side effects, directly supporting mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Reference test files and a reference patch align visible and hidden test coverage for testing the fix on correct behavior and regressions. reason: This ensures tests are relevant, runnable in the repo’s workflow, and exercise the required behavior with meaningful assertions.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion has a detailed description explaining its importance, e.g., 'Hidden behavioral tests extracted from the source fix pass after the submitted patch.' reason: Clear descriptions help raters understand why each criterion matters.
- [info] tests/grader/frontiercode.yaml evidence: Blocker flags are appropriately set for critical criteria like hidden_reference_tests_pass (blocker: true), scope_matches_reference_intent (blocker: true), ensuring task quality. reason: Blocker settings reflect which criteria must be met for task acceptance.
- [info] tests/grader/frontiercode.yaml evidence: Weight assignments range from 0.35 for hidden tests, down to 0.02 for minor behavioral or maintainability checks. reason: Weights correlate well with the importance and risk of each criterion relative to the task scope.
- [info] tests/grader/frontiercode.yaml evidence: Calibrations show the criteria respond correctly in the reference fix versus no-op base scenarios. reason: Proper calibration supports that the rubric design validly measures quality and risk.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blockers include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak. reason: These blockers cover behavioral correctness, guard against regressions on the base snapshot, enforce patch scope, and prevent hidden asset leaks, reflecting true hard stops for maintainer review.
- [info] tests/grader/calibration/reference.patch evidence: The calibration reference patch fixes the core issue by changing the eviction logic comparison to a strict less-than instead of less-or-equal. reason: This critical fix is tied to the hidden_reference_tests_pass blocker, confirming that failing this test implies the patch is not merged.
- [info] tests/grader/frontiercode.yaml evidence: The submitted_tests_fail_on_base blocker ensures existing tests fail on the broken base, demonstrating test sensitivity to the fix. reason: This prevents false positives on incorrect (unfixed) patches, enforcing a hard stop for incomplete fixes.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/topk/topk.go evidence: Patch changes if it.Count <= t.items[minIdx].Count to if it.Count < t.items[minIdx].Count to keep first minimum stable reason: This fix directly addresses the core logic problem of tie handling for eviction.
- [info] internal/topk/topk_test.go evidence: Tests include TestEviction that exercises eviction path and TestExact that confirms counts correctness reason: Visible tests meaningfully cover both general and eviction-specific correctness, helping prevent trivial bypass.
- [info] tests/grader/frontiercode.yaml evidence: Criteria includes hidden_reference_tests_pass that runs extracted reference behavioral tests from the source fix commit reason: Hidden tests validate core fix behavior and fail on broken base, preventing false positives from incomplete visible tests.
- [info] tests/grader/frontiercode.yaml evidence: Calibration includes a no-op base hack that fails most criteria and a private reference fix with full pass reason: Calibration confirms that weak solutions or no-op patches do not pass, demonstrating good false-positive resistance.
- [info] adversarial-1 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-2 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-3 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-4 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, no_hidden_asset_leak; score=0.375 reason: candidate did not clear the false-positive gate
- [warn] adversarial-5 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Contains an alternative_valid calibration with the fix commit patch fixing the comparison to strictly less (<) to keep the first minimum index. reason: This calibration shows acceptance of the correct stable minimum victim behavior, crucial for false-negative resistance in tie eviction logic.
- [info] internal/topk/topk_test.go (in calibration/reference.patch) evidence: TestEcution and TestObserveN verify key eviction and ordering, including sufficient snapshots to check correctness of minimum removal. reason: These tests provide independent validation of stable eviction for tied minimum counts and confirm non-full insertion behavior remains consistent.
- [info] tests/grader/frontiercode.yaml evidence: Multiple criterions ensure the patch is in appropriate scope, absence of unrelated API changes, and integration with test workflow. reason: Ensures that the test coverage and validation focus on the topk eviction behavior without brittle or overly constraining test requirements.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/topk/topk_test.go evidence: The file contains tests such as TestExact, TestEviction, TestObserveN, and TestReset validating eviction and tracking logic including eviction when full and stable minimum selection. reason: These tests cover behavior for the eviction path, including tied minimum counts as required by the task instruction.
- [info] tests/grader/frontiercode.yaml evidence: The criterion 'submitted_tests_fail_on_base' uses reverse_classical method to confirm submitted tests fail on the original broken base snapshot, ensuring test correctness and capturing the bug. reason: This confirms the submitted tests meaningfully validate the patched behavior by failing on the buggy original base.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'visible_regression_tests_pass' confirms tests pass on the fixed repo, ensuring tests are integrated and valid. reason: It shows the submitted tests integrate with the repository test workflow and pass after the fix.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope criteria: allowed_paths include ['internal/topk/', 'internal/topk/topk.go', 'internal/topk/topk_test.go']; max_files = 6; max_changed_lines = 250 reason: Explicit scope constraints clearly delimit the code areas that the patch can modify, controlling scope tightly.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No embedded hidden tests, grading prompts, or reference outputs seen; contains only public instructions and guidelines. reason: Maintains separation of hidden assets from visible instructions.
- [info] task.toml evidence: Contains only task metadata and environment configuration; no hidden grader content or patch references. reason: Task configuration free of hidden grading assets.
- [info] environment/repo/ evidence: Typical repository files for build, source, and tests; no hidden tests or grader materials visible; hidden tests and calibration patches reside exclusively under tests/hidden/ and tests/grader/ which are not exposed inside environment/repo/ reason: Hidden grader assets properly isolated outside of the visible repo subtree.
- [info] No top-level solution folder evidence: The file tree shows no presence of a top-level solution folder in agent-visible areas. reason: A top-level solution folder is disallowed to prevent leak of solutions.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/repo/Dockerfile evidence: Multi-stage Dockerfile uses official golang:1.22-bookworm for build and distroless-like debian:slim for runtime with correct entrypoint and healthcheck. reason: This confirms a clean, minimal, and reproducible environment suitable for fresh end-to-end packaging and testing.
- [info] tests/test.sh evidence: test.sh invokes tests/hidden/run_criteria.py on the repo environment, ensuring automated execution of all grading criteria in a clean checked-out repo. reason: This scripted entrypoint supports running tests including compilation, hidden behavioral tests, and regression validation in a fresh environment.
- [info] tests/grader/frontiercode.yaml evidence: The grader config defines clear blocker criteria covering patch behavioral tests, regression, scope, asset leaks, and integration, all marked as blocker and executed via the test.sh script. reason: This guarantees that an end-to-end evaluation can be performed automatically fitting FrontierCode standards.
- [info] task.toml evidence: Specifies docker_image = 'golang:1.24-bookworm' and network_mode 'public' for straightforward containerized execution. reason: This enables running the task through Harbor or equivalent container orchestrator with consistent environment.
- [info] tests/grader/calibration/reference.patch evidence: Calibration patch linked in grader ensures tests validate the specific fix for stable eviction on ties, supporting deterministic validation. reason: This is key for verifying correctness and that the visible and hidden tests exercise the intended behavior fully.
