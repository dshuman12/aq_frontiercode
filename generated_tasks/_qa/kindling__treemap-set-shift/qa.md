# FrontierCode Task QA

- Tasks: 1
- Passed: 1
- Failed: 0
- Checks per task: 11

## kindling__treemap-set-shift

Status: PASS

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.90 | The instruction.md clearly states the user-facing request and constraints, focusing on fixing the insertion logic without over-specifying the implementation details. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | The visible testing, lint, build, and style guidance in instruction.md align well with the repository's actual maintainer workflow and the visible regression test commands. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.90 | The grader/frontiercode.yaml rubric includes comprehensive criteria covering mergeability aspects such as correctness, regressions, scope, tests, and code quality, with strong classical and scope-based objective checks plus LLM-prompted subjective quality criteria. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 0.90 | All rubric items have clear rationales explaining their importance, blocker flags that appear intentional, and weights that align reasonably with detection risk and task scope. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blockers in tests/grader/frontiercode.yaml correspond to valid, high-impact criteria that prevent patch merge if failed, matching the typical maintainer hard stops. |
| 06_false_positive_resistance False Positive Resistance | PASS | 0.90 | The test suite and hidden criteria robustly cover insertion behavior, preventing false positives for the task fix. The calibration includes a no-op-base hack that fails tests, ensuring weak solutions cannot pass. Adversarial probe: Adversarial patches were generated, but none passed the false-positive gate. |
| 07_false_negative_resistance False Negative Resistance | PASS | 1.00 | The grader configuration includes a reference fix patch as an alternative_valid calibration that sets the correct shifting of entries. The provided tests in internal/treemap/treemap_test.go cover insertion at front, middle, end, overwrites, and retrieval, meeting false-negative resistance requirements. |
| 08_agent_tests Agent Test Correctness | PASS | 0.90 | The task requires adding or extending tests in internal/treemap to verify insertion correctness, and such tests are present in internal/treemap/treemap_test.go. The grader criteria includes reverse_classical testing that runs submitted tests against the broken base to ensure they fail, demonstrating the tests capture the buggy behavior. This satisfies the QA requirement for agent test correctness. |
| 09_scope_controls Scope Controls | PASS | 0.90 | The scope criteria explicitly constrain changes to a narrow set of paths relevant to the task (internal/treemap/ and related files), with reasonable limits on max files and changed lines to prevent unrelated rewrites or file churn. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 0.90 | No hidden grader assets, reference patches, or calibration patches are exposed in agent-visible files; the agent repo tree contains no top-level solution folder and only intended code and docs are visible. |
| 11_packaging_e2e End To End Packaging | PASS | 1.00 | The task packaging supports clean builds and testing in a fresh container using the provided Dockerfile and test.sh, with full passing criteria confirmed by a robust hidden grader configuration. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: Fix `Set` so that inserting a new key opens a gap at the computed insertion index by shifting the existing entries (keys and their associated values) one position to the right, then writes the new key/value into that gap. reason: This states the required behavior for the fix clearly without specifying exact code changes or patch strategy.
- [info] instruction.md evidence: Keep the existing exported method set, signatures, and ordering semantics unchanged; this is strictly a correctness fix to the insertion path. reason: This ensures the prompt does not require changing public APIs or broader behavior, maintaining focus and clarity.
- [info] instruction.md evidence: Run `go test ./internal/treemap/...` to validate. Add or extend tests covering insertion at front, middle, end, overwrites, and Get retrieval correctness. reason: Provides guidance on test expectations without prescribing exact implementation or test code specifics.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Testing guidance says: Run `go test ./internal/treemap/...` to validate; visible_regression_tests_pass criterion uses this exact command. reason: Ensures visible test instructions match maintainers' visible workflow for validation and regression testing.
- [info] environment/repo/CONTRIBUTING.md evidence: Contributing documentation instructs to run `go vet ./...`, `go test ./...`; instruction.md asks to run `go vet ./internal/treemap/...` plus gofmt on changes. reason: Visible lint guidance is consistent with the repo's lint and testing commands.
- [info] instruction.md evidence: Instruction style guideline specifies branch creation from the snapshot and no rebasing, matching typical FrontierCode style best practice. reason: Style instructions provide enough context to follow repo conventions without revealing hidden grader details.
- [info] tests/grader/frontiercode.yaml evidence: Visible regression test commands use `go test ./internal/treemap/...` matching instruction.md. reason: Consistent commands mean the visible guidance effectively supports user-visible validation.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Criteria include hidden_reference_tests_pass (classical), submitted_tests_fail_on_base (reverse_classical), visible_regression_tests_pass (command), and scope_matches_reference_intent (scope) all marked blocker true. reason: Objective checks enforce behavioral correctness, test regression, and patch scope limitations critical to mergeability.
- [info] tests/grader/frontiercode.yaml evidence: Additional criteria use llm_prompt method for subjective quality like behavior_core_requirement, behavior_edge_cases, maintainability_idiomatic_design, test coverage, and regression relevance. reason: Subjective LLM scoring ensures code quality, design idiomaticity, edge case handling, and test integration beyond mechanical correctness.
- [info] tests/grader/frontiercode.yaml evidence: Scope rules constrain patch impact to internal/treemap only, no unrelated file changes or public API changes allowed. reason: Restricting scope prevents unintended broad rewrites and ensures focused fixes.
- [info] tests/grader/frontiercode.yaml evidence: No hidden asset leak criterion exists to avoid leaking grader assets into the submission. reason: This is important to maintain clean and artifact-free public repositories.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion has a descriptive 'description' field stating why it matters; keys like 'blocker' are set (mostly true for critical criteria), and 'weight' values range from 0.02 for minor checks to 0.35 for critical checks. reason: Clear descriptions help reviewers understand the criterion's intent, blocker flags accurately indicate pass-fail impact, and weight calibration reflects the relative importance of each check relative to patch risk and scope.
- [info] tests/grader/frontiercode.yaml evidence: The major blocker criteria (hidden_reference_tests_pass 0.35, submitted_tests_fail_on_base 0.15, visible_regression_tests_pass 0.20, scope_matches_reference_intent 0.15, no_hidden_asset_leak 0.05) sum to 0.9 total, showing appropriate prioritization of correctness and scope controls. reason: Overall weighting appears balanced to emphasize behavioral correctness and scope containment as primary risks.
- [info] tests/grader/frontiercode.yaml evidence: Non-blocker criteria with small weights (0.02) cover nuanced quality areas such as maintainability, integration, regression meaning, edge cases, backward compatibility, and error handling. reason: This granular weighting for minor aspects is consistent with their supplementary role to the core correctness criteria.

### 05_blocker_validity Blocker Validity

Findings:
- [fail] tests/grader/frontiercode.yaml evidence: Blocker 'hidden_reference_tests_pass' fails with base patch and passes with fix patch; tests verify core correctness behavior preventing corrupted map state. reason: True hard stop: patch must fix insertion logic for sorted map correctness to avoid silent data corruption.
- [fail] tests/grader/frontiercode.yaml evidence: Blocker 'submitted_tests_fail_on_base' fails on base and passes on patch, ensuring task tests detect original breakage. reason: Ensures submitted tests meaningfully capture failure, preventing acceptance of broken implementations.
- [fail] tests/grader/frontiercode.yaml evidence: Blocker 'visible_regression_tests_pass' governs that visible tests run fully without regressions post-patch. reason: Protects against regressions in visible project tests, an essential maintainer check.
- [fail] tests/grader/frontiercode.yaml evidence: Blocker 'scope_matches_reference_intent' restricts patch scope to only relevant files and limited changed lines consistent with fix context. reason: Prevents broad or irrelevant code changes which could hide defects or cause maintenance burden.
- [fail] tests/grader/frontiercode.yaml evidence: Blocker 'no_hidden_asset_leak' ensures no grader assets or test artifacts are leaked in public repo. reason: Prevents accidental exposure of hidden test helpers or internal metadata which could compromise assessment or security.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] internal/treemap/treemap.go evidence: Copy operations corrected from copy(..., idx+1) to copy(..., idx) to properly shift entries right on insertion. reason: Correctly shifting entries is central to avoiding silent key overwrites and length inconsistency.
- [info] internal/treemap/treemap_test.go evidence: Tests cover insertion at front, middle, and end; key ordering; get and overwrite; delete; range with early stop; clear; prefix matches. reason: This comprehensive coverage addresses the primary bug scenario and related correctness guarantees.
- [info] tests/grader/frontiercode.yaml evidence: Hidden criteria with blocker=true include: hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass. reason: These criteria mandate tests that catch incorrect base behavior and validate a correct fix, preventing weak or partial solutions.
- [info] tests/grader/frontiercode.yaml evidence: Calibration includes no-op-base hack that leaves repo unchanged but fails hidden behavioral tests. reason: This hack calibration prevents passing submissions that do nothing or avoid core behavior fixes, guarding against false positives.
- [info] adversarial-1 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-2 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate
- [info] adversarial-3 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-4 evidence: model did not return a patch reason: no adversarial candidate
- [info] adversarial-5 evidence: blocker_failures=hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, no_hidden_asset_leak; score=0.000 reason: candidate did not clear the false-positive gate

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Calibration 'reference-fix' uses reference.patch implementing the expected shift fix and passes all criteria hidden_reference_tests_pass, visible_regression_tests_pass, and submitted_tests_fail_on_base. reason: This ensures that the task accepts this valid solution as correct and does not reject legitimate fixes due to brittle checks.
- [info] internal/treemap/treemap_test.go evidence: Tests cover empty map, set/get, overwrite, multiple keys inserted out of order and check sorted order, delete, range and prefix matching. reason: These tests collectively cover a variety of valid insertions including new keys at all positions, confirming the patch will not cause false negatives for correct implementations.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] internal/treemap/treemap_test.go evidence: The newly added treemap_test.go includes tests for Set inserting keys in various order, overwrites, length checks, and key sorting reason: The tests meaningfully cover insertion behaviors and verify key order and length, exactly as the task requires.
- [info] tests/grader/frontiercode.yaml evidence: Criterion 'submitted_tests_fail_on_base' has method 'reverse_classical' with command running tests on base broken snapshot to confirm test failures reason: This ensures the submitted tests catch the buggy behavior by failing before the fix, confirming their meaningfulness.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: scope.allowed_paths includes ["internal/treemap/", "internal/treemap/treemap.go", "internal/treemap/treemap_test.go"] with max_files: 6 and max_changed_lines: 345 reason: Explicit scope controls limit patch size and restrict edits to relevant feature and test files, preventing scope creep.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: No hidden test, grading prompt, or reference output content detected; contains only task description, test and lint guidelines. reason: Instructions must be free from hidden grader data to avoid leak to the agent.
- [info] task.toml evidence: No grader assets or hidden tests referenced; only task metadata and docker_image specified. reason: Task manifest must exclude hidden grader or calibration details.
- [info] environment/repo/ evidence: Repository tree contains source code, documentation, workflows, no grader or hidden tests. reason: Agent-visible repo must not expose hidden tests or grader assets.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] environment/repo/Dockerfile evidence: The multi-stage Dockerfile builds and runs the kindling binary cleanly with no external deps. reason: Ensures reproducible task environment for reliable testing.
- [info] tests/test.sh evidence: The test.sh script cleanly invokes the hidden run_criteria.py script against the repository. reason: Validates tests can be executed end-to-end within the environment.
- [info] tests/grader/frontiercode.yaml evidence: Contains explicit criteria commands with blocking weights to run hidden and visible tests on a clean repo checkout. reason: Ensures task correctness and test coverage are verified via automated grading.
- [info] tests/grader/calibration/reference.patch evidence: Reference fix patch passes all blocking criteria and verifies the behavior and scope with full test coverage and integration. reason: This patch calibration demonstrates the task is designed for full validation in an isolated, clean environment.
