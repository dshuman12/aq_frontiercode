# FrontierCode Task QA

- Tasks: 1
- Passed: 0
- Failed: 1
- Checks per task: 11

## queryweave__838743095c6a

Status: FAIL

| Check | Status | Confidence | Summary |
| --- | --- | ---: | --- |
| 01_prompt_clarity Prompt Clarity | PASS | 0.95 | The instruction.md clearly and concisely describes the user-facing task to implement a recursive descent parser using existing lexer and AST classes, with appropriate constraints and no over-specification of patch strategy. |
| 02_visible_workflow Visible Workflow Guidance | PASS | 0.90 | Visible workflow guidance in instruction.md aligns well with the repo's test and lint setup, providing clear pytest commands targeting the parser tests and consistent lint/style instructions matching the repo's configurations. |
| 03_rubric_coverage Rubric Coverage | PASS | 0.95 | The rubric in tests/grader/frontiercode.yaml comprehensively covers mergeability aspects including behavior, regressions, mechanical cleanliness, test integration, scope, and code quality as required. |
| 04_rubric_metadata Rubric Rationale And Weights | PASS | 1.00 | All rubric criteria have meaningful rationales in their descriptions, the blocker status aligns with expected importance, and the weights appear well calibrated relative to the task scope and risks. |
| 05_blocker_validity Blocker Validity | PASS | 0.90 | All blocker criteria in tests/grader/frontiercode.yaml correspond to standard and critical verifications for this parser task and reflect true hard stops that maintainers would enforce prior to merging. |
| 06_false_positive_resistance False Positive Resistance | FAIL | 0.90 | The task includes a robust recursive descent parser implementation and a comprehensive test suite in tests/test_parser.py, alongside strong hidden tests validating core parser behavior, which together mitigate plausible shortcuts or rubric gaps that would allow false positives. Adversarial probe: All 5 adversarial model attempts failed before returning a patch decision. |
| 07_false_negative_resistance False Negative Resistance | PASS | 0.90 | The task includes an alternative valid calibration patch with parser implementation and tests that pass all hidden and visible criteria, indicating resistance to false negatives and acceptance of valid non-canonical solutions. |
| 08_agent_tests Agent Test Correctness | PASS | 0.99 | The task explicitly requires adding parser-focused tests in tests/test_parser.py, and the grading criteria include reverse_classical method 'submitted_tests_fail_on_base' that runs visible tests on the base snap to confirm failure. The hidden ref tests and visible tests pass successfully after patch, indicating meaningful test coverage and proper failure on base. |
| 09_scope_controls Scope Controls | PASS | 1.00 | The task includes explicit and clear scope controls restricting changes to 'src/queryweave/parser/parser.py' and test files under 'tests/', with sensible limits on max files and max changed lines. |
| 10_hidden_asset_isolation Hidden Asset Isolation | PASS | 1.00 | No hidden grader assets, reference outputs, or calibration patches are present in the agent-visible files or directories; no top-level solution folder exists. |
| 11_packaging_e2e End To End Packaging | PASS | 0.90 | The task supports full end-to-end packaging and testing in a fresh environment with a proper Docker base image, a working test.sh that invokes the standard test workflow, and passing deterministic QA criteria. |

### 01_prompt_clarity Prompt Clarity

Findings:
- [info] instruction.md evidence: Task description section: 'Add the recursive descent parser in src/queryweave/parser/parser.py and expose a small parse(query: str) convenience function... The parser should consume the existing Lexer and TokenStream APIs, build the dataclasses in src/queryweave/parser/ast_nodes.py, and respect the operator precedence implied by normal SQL expressions... Keep this focused on parsing only; do not build storage, optimization, execution, or catalog behavior as part of this task.' reason: This wording states the user-focused functional goal and required constraints clearly, without prescribing a rigid implementation approach or patch details.
- [info] instruction.md evidence: Test guidelines section: 'Add parser-focused tests under tests/test_parser.py that exercise the public behavior you are adding... Tests should target parser, lexer, and AST modules directly rather than relying on top-level queryweave exports from later versions.' reason: This guides test writing at the intended scope without detailing exactly how to implement the parser.
- [info] instruction.md evidence: Style guidelines section: 'Keep the implementation localized to the parser module and parser tests unless a tiny import compatibility adjustment is necessary... Do not rebase or start from master, main, or any other branch.' reason: This confines the patch scope suitably without enforcing exact code patterns.

### 02_visible_workflow Visible Workflow Guidance

Findings:
- [info] instruction.md evidence: Test guidelines: Run `pytest tests/test_parser.py` and ensure it passes. reason: The test command matches the visible test file `tests/test_parser.py` which is part of the repo and consistent with the pytest config (pyproject.toml).
- [info] instruction.md evidence: Lint guidelines: Use existing Python style from lexer.py and ast_nodes.py; quick syntax check with `python -m compileall src tests`. reason: The linting guidance matches the repository's lack of extra formatter or linter config additions, using existing styles consistent with pyproject.toml ruff and mypy configurations.
- [info] instruction.md evidence: Implementation scope: localized to parser module and parser tests, avoiding unrelated changes. reason: This matches the allowed changed paths in grader config that constrain changes within `src/queryweave/parser/parser.py` and tests.
- [info] tests/test.sh evidence: tests/test.sh runs `python3 "$task_root/tests/hidden/run_criteria.py" "$repo"` which drives evaluation including visible tests reason: This harness aligns with the visible test commands described and the hidden grading approach, allowing reproducible testing without exposing hidden assets.

### 03_rubric_coverage Rubric Coverage

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Includes multiple criteria addressing hidden reference test passing (behavior), submitted test failure on base (test relevance), visible regression tests (mechanical correctness), scope matches (scope control), no hidden asset leaks (cleanliness), and several LLM prompt criteria for subjective quality such as maintainability, dependency, and error handling. reason: These criteria ensure that the patch is correct functionally, does not regress existing tests, adheres to intended scope, avoids extraneous files, and maintains code quality.
- [info] tests/grader/frontiercode.yaml evidence: Criteria like behavior_core_requirement, behavior_edge_cases, behavior_error_handling, and behavior_backward_compatibility use llm_prompt with appropriate threshold for deeper semantic validation of behavior and integration. reason: This supports subjective review where pure automated tests may not cover nuanced correctness or design quality aspects.
- [info] tests/grader/frontiercode.yaml evidence: Test coverage criteria for positive and negative paths and integration with existing workflows are included and mapped to visible test file tests/test_parser.py. reason: Ensures submitted tests meaningfully cover new parser behavior including failures and integrate into standard testing processes for maintainability.
- [info] tests/grader/frontiercode.yaml evidence: Scope criteria restrict changes to parser.py and test files with limits on number of files and lines changed. reason: Prevents overly broad, unrelated churn facilitating easier review and merge.

### 04_rubric_metadata Rubric Rationale And Weights

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Each criterion includes a description explaining its rationale; blocker flags are set for critical criteria like hidden_reference_tests_pass (weight 0.35) and visible_regression_tests_pass (weight 0.20); lighter weights (0.02) and non-blocking statuses apply to advisory, LLM-based semantic criteria. reason: Meaningful rationale descriptions aid reviewer understanding; blocker flags and weights correspond to task risk areas, ensuring highlighting of critical failures.

### 05_blocker_validity Blocker Validity

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Blocker criteria include hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass, scope_matches_reference_intent, and no_hidden_asset_leak. reason: These blockers ensure the patch passes comprehensive hidden tests, that submitted tests fail on the base (confirming correct test coverage), that visible regression tests pass, that the patch scope is limited to expected files, and that no sensitive assets leak — all are appropriate hard stops.
- [info] tests/grader/calibration/reference.patch evidence: A reference patch is provided that passes all blockers and serves as a calibration baseline. reason: This confirms that the blocker criteria are achievable and meaningful in detecting incomplete or incorrect parser implementations, blocking merges that would fail critical parser behaviors.
- [info] tests/hidden/reference_tests/tests/test_parser.py evidence: Comprehensive parser-focused tests validate syntax features, error handling, and various SQL constructs as indicated by hidden_reference_tests_pass criterion. reason: Failing this test indicates broken core parser functionality, justifying blocker status for hidden_reference_tests_pass.

### 06_false_positive_resistance False Positive Resistance

Findings:
- [info] tests/hidden/reference_tests/tests/test_parser.py evidence: The test suite exercises diverse syntax elements including SELECT with aliases, joins, filters, aggregations, window functions, subqueries, UNION ALL, and DML/DDL statements, as well as malformed queries that raise parse errors. reason: This breadth in tests reduces risk of solutions passing by ignoring complex SQL features or basic error handling.
- [info] tests/grader/frontiercode.yaml evidence: Includes critical criteria such as hidden_reference_tests_pass (blocker), submitted_tests_fail_on_base (blocker), visible_regression_tests_pass (blocker), and scope verification closely matched to parser modules and tests. reason: The criteria enforce that submitted changes introduce genuine parsing behavior change, fail on base code, and stay in scope, minimizing rubric gaps or superficial passes.
- [info] tests/grader/calibration/reference.patch evidence: Contains a comprehensive reference parser implementation plus regression tests. reason: This calibration acts as a strong oracle to prevent weak or partial parser implementations from passing.
- [warn] adversarial-1 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [warn] adversarial-2 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [warn] adversarial-3 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [warn] adversarial-4 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524
- [warn] adversarial-5 evidence: adversarial model call failed reason: Task QA model request failed: HTTP Error 524: <none>; response body: error code: 524

Recommended fixes:
- Fix the adversarial model client configuration and rerun QA.

### 07_false_negative_resistance False Negative Resistance

Findings:
- [info] tests/grader/frontiercode.yaml evidence: calibrations section includes 'reference-fix' alternative_valid patch with full passing criteria results reason: Having an alternative valid calibration patch that passes all critical criteria supports that the task's test and grading infrastructure does not reject valid solutions due to brittle criteria.
- [info] tests/hidden/reference_tests/tests/test_parser.py evidence: Tests cover various SQL constructs including aliases, joins, expressions, edge cases, and malformed input reason: Coverage of both positive and negative paths ensures that alternative parser implementations can be validated without overfitting to specific brittle details.
- [info] instruction.md evidence: Instruction encourages adding parser-focused tests and does not mandate a single canonical parsing approach reason: This flexibility supports multiple valid solutions and avoids overly prescriptive parsing implementation that would trigger false negatives.

### 08_agent_tests Agent Test Correctness

Findings:
- [info] tests/test_parser.py evidence: Presence of extensive parser-focused tests covering SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, complex expressions, unions, errors. reason: This file includes the agent-submitted tests exercising the requested parser behavior.
- [info] tests/grader/frontiercode.yaml evidence: Criteria id 'submitted_tests_fail_on_base' uses reverse_classical method running 'tests/hidden/run_criteria.py' to check submitted visible tests fail on base. reason: This validates that submitted tests effectively detect the absence of parser implementations in the base snapshot.
- [info] tests/hidden/run_criteria.py evidence: Implements check_submitted_tests_fail_on_base to run submitted tests on base repo and expect failure. reason: This script underlies the reverse_classical method ensuring submitted tests are meaningful.
- [info] tests/hidden/reference_tests/tests/test_parser.py evidence: Reference test file contains parser tests that also pass after patch, confirming proper parser behavior coverage. reason: Reference tests align with visible tests, reinforcing test correctness and coverage.

### 09_scope_controls Scope Controls

Findings:
- [info] tests/grader/frontiercode.yaml evidence: Scope check criteria: allowed_paths include 'src/queryweave/parser/parser.py', 'tests/', and 'tests/test_parser.py'; max_files set to 6 and max_changed_lines to 2787. reason: This explicit allowed_paths and max_files criteria effectively constrain the patch scope to the parser implementation and associated tests, preventing unrelated rewrites or excessive churn.

### 10_hidden_asset_isolation Hidden Asset Isolation

Findings:
- [info] instruction.md evidence: instruction.md contains only task description, test, lint, and style guidelines with no hidden test or grading data. reason: Instruction files must not leak hidden grader assets or reference materials to the agent.
- [info] task.toml evidence: task.toml specifies task metadata and docker image without exposing grader or hidden test information. reason: Configuration must not reveal hidden grader assets or test answers.
- [info] environment/repo evidence: Agent-visible repo contains only source files and no hidden test files, no grader files, and no solution folder. reason: Agent should see only source and visible test code without hidden assets or solution code.

### 11_packaging_e2e End To End Packaging

Findings:
- [info] task.toml evidence: docker_image is set to 'python:3.12-bookworm' to provide a fresh environment. reason: Using a stable, public docker image ensures a clean and reproducible environment for test execution.
- [info] tests/test.sh evidence: test.sh runs 'python3 tests/hidden/run_criteria.py "$repo"' invoking the main test suite. reason: This script successfully triggers the full test and grading criteria centrally.
- [info] tests/hidden/run_criteria.py evidence: The script runs multiple criteria including visible regression tests and hidden reference tests. reason: The existence of criteria that run in a separate temporary copy of the repo ensures tests run in isolation.
- [info] tests/grader/frontiercode.yaml evidence: Includes end-to-end test commands verifying tests pass on the repo, e.g. pytest on tests/test_parser.py. reason: This confirms the test commands and environment are correctly set up for the task.
- [info] environment/repo/pyproject.toml evidence: Specifies python >=3.10 and includes pytest in dev dependencies. reason: This supports test execution environment consistency.
