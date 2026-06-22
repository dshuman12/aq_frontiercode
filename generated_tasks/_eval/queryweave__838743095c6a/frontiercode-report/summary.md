# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 10
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | 10 | 0.000 | 0.642 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | 10 | 0.000 | 0.642 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__9sb8pE8 | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__Bt26FN7 | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__EJfr3xZ | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__MiZgJtY | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__Zc2tREV | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__ZxkJzVK | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__d5FvuhT | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__gxvXVA7 | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__h3QGY8E | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__ybD8sgS | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>queryweave__838743095c6a__9sb8pE8: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-33emsffh/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-33emsffh/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-33emsffh/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.10s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-bczkia44/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-bczkia44/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.10s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-sdk7zzgi/repo
configfile: pyproject.toml
collecting ... collected 10 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [ 10%]
tests/test_parser.py::test_parse_where_expression_precedence_and_predicates PASSED [ 20%]
tests/test_parser.py::test_parse_joins_group_having_order_limit_offset PASSED [ 30%]
tests/test_parser.py::test_parse_case_expression PASSED                  [ 40%]
tests/test_parser.py::test_parse_window_call PASSED                      [ 50%]
tests/test_parser.py::test_parse_union_all PASSED                        [ 60%]
tests/test_parser.py::test_parse_insert_update_delete PASSED             [ 70%]
tests/test_parser.py::test_parse_create_and_drop_table PASSED            [ 80%]
tests/test_parser.py::test_parse_aggregate_distinct_and_star PASSED      [ 90%]
tests/test_parser.py::test_malformed_input_raises_parser_error PASSED    [100%]

============================== 10 passed in 0.05s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__Bt26FN7: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-3q2nam1_/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-3q2nam1_/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-3q2nam1_/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.18s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-rksnva01/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-rksnva01/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.17s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-rjlmp77p/repo
configfile: pyproject.toml
collecting ... collected 14 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  7%]
tests/test_parser.py::test_parser_accepts_lexer_and_token_stream PASSED  [ 14%]
tests/test_parser.py::test_where_expression_precedence PASSED            [ 21%]
tests/test_parser.py::test_joins_group_having_order_limit_offset PASSED  [ 28%]
tests/test_parser.py::test_aggregate_and_function_calls PASSED           [ 35%]
tests/test_parser.py::test_case_expression PASSED                        [ 42%]
tests/test_parser.py::test_window_call PASSED                            [ 50%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 57%]
tests/test_parser.py::test_insert_update_delete PASSED                   [ 64%]
tests/test_parser.py::test_create_and_drop_table PASSED                  [ 71%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT FROM users] PASSED [ 78%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT * FROM users LEFT JOIN orders] PASSED [ 85%]
tests/test_parser.py::test_malformed_input_raises_parser_error[INSERT INTO users VALUES (1, 'Ada'] PASSED [ 92%]
tests/test_parser.py::test_malformed_input_raises_parser_error[CREATE TABLE broken (id)] PASSED [100%]

============================== 14 passed in 0.07s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__EJfr3xZ: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-p8uqa68g/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-p8uqa68g/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-p8uqa68g/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.11s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-pna1z_pq/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-pna1z_pq/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:6: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.11s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-wxrv8hut/repo
configfile: pyproject.toml
collecting ... collected 15 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  6%]
tests/test_parser.py::test_parser_accepts_lexer_input PASSED             [ 13%]
tests/test_parser.py::test_where_expression_precedence_and_predicates PASSED [ 20%]
tests/test_parser.py::test_joins_group_having_order_limit_offset PASSED  [ 26%]
tests/test_parser.py::test_aggregate_calls PASSED                        [ 33%]
tests/test_parser.py::test_case_expression PASSED                        [ 40%]
tests/test_parser.py::test_window_call PASSED                            [ 46%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 53%]
tests/test_parser.py::test_insert_update_delete PASSED                   [ 60%]
tests/test_parser.py::test_create_and_drop_table PASSED                  [ 66%]
tests/test_parser.py::test_malformed_input_raises_syntax_error[SELECT FROM users] PASSED [ 73%]
tests/test_parser.py::test_malformed_input_raises_syntax_error[SELECT id FROM users WHERE] PASSED [ 80%]
tests/test_parser.py::test_malformed_input_raises_syntax_error[INSERT INTO users VALUES (1,)] PASSED [ 86%]
tests/test_parser.py::test_malformed_input_raises_syntax_error[CREATE TABLE users (id)] PASSED [ 93%]
tests/test_parser.py::test_malformed_input_raises_syntax_error[SELECT id FROM users JOIN orders] PASSED [100%]

============================== 15 passed in 0.06s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__MiZgJtY: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-dmr0pcc6/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-dmr0pcc6/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-dmr0pcc6/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.09s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-i61z8igl/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-i61z8igl/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:6: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.08s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-uv_t3l4x/repo
configfile: pyproject.toml
collecting ... collected 19 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  5%]
tests/test_parser.py::test_parser_accepts_existing_lexer_and_token_stream PASSED [ 10%]
tests/test_parser.py::test_where_expression_precedence_and_predicates PASSED [ 15%]
tests/test_parser.py::test_between_in_and_is_null_predicates PASSED      [ 21%]
tests/test_parser.py::test_joins_group_having_order_limit_offset PASSED  [ 26%]
tests/test_parser.py::test_aggregate_and_function_calls PASSED           [ 31%]
tests/test_parser.py::test_case_expression PASSED                        [ 36%]
tests/test_parser.py::test_window_function_call PASSED                   [ 42%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 47%]
tests/test_parser.py::test_insert_values_and_select PASSED               [ 52%]
tests/test_parser.py::test_update_statement PASSED                       [ 57%]
tests/test_parser.py::test_delete_statement PASSED                       [ 63%]
tests/test_parser.py::test_create_and_drop_table PASSED                  [ 68%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[SELECT FROM users] PASSED [ 73%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[SELECT id FROM users WHERE] PASSED [ 78%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[INSERT INTO users VALUES (1] PASSED [ 84%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[UPDATE users SET name 'Ada'] PASSED [ 89%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[CREATE TABLE users (id)] PASSED [ 94%]
tests/test_parser.py::test_malformed_input_reports_syntax_errors[SELECT id FROM a UNION] PASSED [100%]

============================== 19 passed in 0.06s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__Zc2tREV: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 1
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-e40icigk/repo
configfile: pyproject.toml
collecting ... collected 7 items

tests/test_parser.py::test_select_with_aliases_join_filter_order_and_limit PASSED [ 14%]
tests/test_parser.py::test_group_having_aggregate_case_and_window_expressions PASSED [ 28%]
tests/test_parser.py::test_predicates_subqueries_and_union_all PASSED    [ 42%]
tests/test_parser.py::test_insert_update_delete_create_and_drop_statements FAILED [ 57%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT FROM users;] PASSED [ 71%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT name FROM users WHERE] PASSED [ 85%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[INSERT INTO users VALUES (1, 2] PASSED [100%]

=================================== FAILURES ===================================
_____________ test_insert_update_delete_create_and_drop_statements _____________
tests/test_parser.py:178: in test_insert_update_delete_create_and_drop_statements
    assert create.columns[0].nullable is False
E   AssertionError: assert True is False
E    +  where True = ColumnDef(name='id', data_type='INTEGER', nullable=True, primary_key=True, default=None).nullable
=========================== short test summary info ============================
FAILED tests/test_parser.py::test_insert_update_delete_create_and_drop_statements - AssertionError: assert True is False
 +  where True = ColumnDef(name='id', data_type='INTEGER', nullable=True, primary_key=True, default=None).nullable
========================= 1 failed, 6 passed in 0.05s ==========================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-rledzckt/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-rledzckt/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.11s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-bdk1865j/repo
configfile: pyproject.toml
collecting ... collected 18 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  5%]
tests/test_parser.py::test_parse_where_expression_precedence_and_predicates PASSED [ 11%]
tests/test_parser.py::test_parse_joins PASSED                            [ 16%]
tests/test_parser.py::test_parse_group_by_and_having PASSED              [ 22%]
tests/test_parser.py::test_parse_order_by_limit_and_offset PASSED        [ 27%]
tests/test_parser.py::test_parse_aggregate_calls PASSED                  [ 33%]
tests/test_parser.py::test_parse_case_expression PASSED                  [ 38%]
tests/test_parser.py::test_parse_window_call PASSED                      [ 44%]
tests/test_parser.py::test_parse_union_and_union_all PASSED              [ 50%]
tests/test_parser.py::test_parse_insert_values PASSED                    [ 55%]
tests/test_parser.py::test_parse_update PASSED                           [ 61%]
tests/test_parser.py::test_parse_delete PASSED                           [ 66%]
tests/test_parser.py::test_parse_create_table PASSED                     [ 72%]
tests/test_parser.py::test_parse_drop_table PASSED                       [ 77%]
tests/test_parser.py::test_parse_between_and_in_predicates PASSED        [ 83%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT FROM users] PASSED [ 88%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT * FROM users LEFT JOIN orders] PASSED [ 94%]
tests/test_parser.py::test_malformed_input_raises_parse_error[INSERT INTO users (id) (1)] PASSED [100%]

============================== 18 passed in 0.07s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__ZxkJzVK: FAIL, score 0.875, criteria 19/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.875
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-no6du5uq/repo
configfile: pyproject.toml
collecting ... collected 7 items

tests/test_parser.py::test_select_with_aliases_join_filter_order_and_limit PASSED [ 14%]
tests/test_parser.py::test_group_having_aggregate_case_and_window_expressions PASSED [ 28%]
tests/test_parser.py::test_predicates_subqueries_and_union_all PASSED    [ 42%]
tests/test_parser.py::test_insert_update_delete_create_and_drop_statements PASSED [ 57%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT FROM users;] PASSED [ 71%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT name FROM users WHERE] PASSED [ 85%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[INSERT INTO users VALUES (1, 2] PASSED [100%]

============================== 7 passed in 0.06s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-wknw6zml/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-wknw6zml/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.23s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-5uvr0tb_/repo
configfile: pyproject.toml
collecting ... collected 19 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  5%]
tests/test_parser.py::test_parser_accepts_lexer_instance PASSED          [ 10%]
tests/test_parser.py::test_parse_where_expression_precedence PASSED      [ 15%]
tests/test_parser.py::test_parse_join_group_having_order_limit_offset PASSED [ 21%]
tests/test_parser.py::test_parse_aggregate_calls PASSED                  [ 26%]
tests/test_parser.py::test_parse_case_expression PASSED                  [ 31%]
tests/test_parser.py::test_parse_window_call PASSED                      [ 36%]
tests/test_parser.py::test_parse_union_and_union_all PASSED              [ 42%]
tests/test_parser.py::test_parse_insert_values PASSED                    [ 47%]
tests/test_parser.py::test_parse_update PASSED                           [ 52%]
tests/test_parser.py::test_parse_delete PASSED                           [ 57%]
tests/test_parser.py::test_parse_create_table PASSED                     [ 63%]
tests/test_parser.py::test_parse_drop_table PASSED                       [ 68%]
tests/test_parser.py::test_parse_comparison_predicates PASSED            [ 73%]
tests/test_parser.py::test_parse_general_function_call PASSED            [ 78%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT FROM users] PASSED [ 84%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT * FROM users WHERE] PASSED [ 89%]
tests/test_parser.py::test_malformed_input_raises_parse_error[INSERT INTO users VALUES (1,)] PASSED [ 94%]
tests/test_parser.py::test_malformed_input_raises_parse_error[CREATE TABLE users (id)] PASSED [100%]

============================== 19 passed in 0.10s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__d5FvuhT: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-be5kh4jx/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-be5kh4jx/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-be5kh4jx/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.12s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-9dr9zn03/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-9dr9zn03/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.10s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-d4_8jndz/repo
configfile: pyproject.toml
collecting ... collected 12 items

tests/test_parser.py::test_simple_and_aliased_select_list PASSED         [  8%]
tests/test_parser.py::test_where_expressions_use_sql_precedence PASSED   [ 16%]
tests/test_parser.py::test_join_parsing PASSED                           [ 25%]
tests/test_parser.py::test_group_having_order_limit_offset_and_aggregate PASSED [ 33%]
tests/test_parser.py::test_case_expression PASSED                        [ 41%]
tests/test_parser.py::test_window_call PASSED                            [ 50%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 58%]
tests/test_parser.py::test_insert_values PASSED                          [ 66%]
tests/test_parser.py::test_update_and_delete PASSED                      [ 75%]
tests/test_parser.py::test_create_and_drop_table PASSED                  [ 83%]
tests/test_parser.py::test_parser_accepts_token_stream_api PASSED        [ 91%]
tests/test_parser.py::test_malformed_input_raises_syntax_error PASSED    [100%]

============================== 12 passed in 0.06s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__gxvXVA7: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-fcfnsuyf/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-fcfnsuyf/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-fcfnsuyf/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.10s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-5tp0rkn4/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-5tp0rkn4/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.07s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-fl7_k31a/repo
configfile: pyproject.toml
collecting ... collected 16 items

tests/test_parser.py::test_simple_and_aliased_select_list PASSED         [  6%]
tests/test_parser.py::test_where_expression_precedence PASSED            [ 12%]
tests/test_parser.py::test_joins_group_having_order_limit_offset PASSED  [ 18%]
tests/test_parser.py::test_aggregate_and_function_calls PASSED           [ 25%]
tests/test_parser.py::test_case_between_and_like_expressions PASSED      [ 31%]
tests/test_parser.py::test_window_call PASSED                            [ 37%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 43%]
tests/test_parser.py::test_insert_values PASSED                          [ 50%]
tests/test_parser.py::test_update_statement PASSED                       [ 56%]
tests/test_parser.py::test_delete_statement PASSED                       [ 62%]
tests/test_parser.py::test_create_table_statement PASSED                 [ 68%]
tests/test_parser.py::test_drop_table_statement PASSED                   [ 75%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT FROM users] PASSED [ 81%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT id FROM users WHERE] PASSED [ 87%]
tests/test_parser.py::test_malformed_input_raises_parser_error[INSERT INTO users VALUES (1,)] PASSED [ 93%]
tests/test_parser.py::test_malformed_input_raises_parser_error[CREATE TABLE users (id)] PASSED [100%]

============================== 16 passed in 0.04s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__h3QGY8E: FAIL, score 0.583, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.583
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-hhpn_96_/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-hhpn_96_/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:78: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-hhpn_96_/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.09s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-re9xfwlp/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-re9xfwlp/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.09s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-ybfbml_0/repo
configfile: pyproject.toml
collecting ... collected 18 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  5%]
tests/test_parser.py::test_parse_where_expression_precedence_and_predicates PASSED [ 11%]
tests/test_parser.py::test_parse_joins PASSED                            [ 16%]
tests/test_parser.py::test_parse_group_having_order_limit_offset PASSED  [ 22%]
tests/test_parser.py::test_parse_aggregate_calls PASSED                  [ 27%]
tests/test_parser.py::test_parse_case_expression PASSED                  [ 33%]
tests/test_parser.py::test_parse_window_call PASSED                      [ 38%]
tests/test_parser.py::test_parse_union_and_union_all PASSED              [ 44%]
tests/test_parser.py::test_parse_insert_values PASSED                    [ 50%]
tests/test_parser.py::test_parse_update PASSED                           [ 55%]
tests/test_parser.py::test_parse_delete PASSED                           [ 61%]
tests/test_parser.py::test_parse_create_table PASSED                     [ 66%]
tests/test_parser.py::test_parse_drop_table PASSED                       [ 72%]
tests/test_parser.py::test_parse_between_and_not_like PASSED             [ 77%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT FROM users] PASSED [ 83%]
tests/test_parser.py::test_malformed_input_raises_parser_error[SELECT id FROM users LEFT JOIN orders] PASSED [ 88%]
tests/test_parser.py::test_malformed_input_raises_parser_error[INSERT INTO users VALUES (1, 'Ada'] PASSED [ 94%]
tests/test_parser.py::test_malformed_input_raises_parser_error[CREATE TABLE users (id)] PASSED [100%]

============================== 18 passed in 0.05s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>queryweave__838743095c6a__ybD8sgS: FAIL, score 0.875, criteria 19/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.875
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| behavior_backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_visible_tests_meaningful | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| regression_reference_area_preserved | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_positive_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_coverage_negative_path | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| test_integration_with_existing_workflow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_no_unrelated_public_api_changes | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_simple_control_flow | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| dependency_and_environment_fit | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| observable_output_contracts | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-hidden-tests-9l95lhtx/repo
configfile: pyproject.toml
collecting ... collected 7 items

tests/test_parser.py::test_select_with_aliases_join_filter_order_and_limit PASSED [ 14%]
tests/test_parser.py::test_group_having_aggregate_case_and_window_expressions PASSED [ 28%]
tests/test_parser.py::test_predicates_subqueries_and_union_all PASSED    [ 42%]
tests/test_parser.py::test_insert_update_delete_create_and_drop_statements PASSED [ 57%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT FROM users;] PASSED [ 71%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[SELECT name FROM users WHERE] PASSED [ 85%]
tests/test_parser.py::test_malformed_queries_raise_parser_error[INSERT INTO users VALUES (1, 2] PASSED [100%]

============================== 7 passed in 0.04s ===============================

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/test_parser.py` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-reverse-classical-e__y0yk8/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-e__y0yk8/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:5: in <module>
    from queryweave.parser.ast_nodes import (
src/queryweave/__init__.py:13: in <module>
    from queryweave.parser.parser import parse
src/queryweave/parser/__init__.py:5: in <module>
    from queryweave.parser.parser import Parser, parse
E   ModuleNotFoundError: No module named 'queryweave.parser.parser'
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.10s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/test_parser.py` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /tmp/frontiercode-visible-tests-hv7pcogd/repo
configfile: pyproject.toml
collecting ... collected 18 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  5%]
tests/test_parser.py::test_parser_accepts_lexer_input PASSED             [ 11%]
tests/test_parser.py::test_where_expression_precedence_and_predicates PASSED [ 16%]
tests/test_parser.py::test_joins_group_having_order_limit_offset PASSED  [ 22%]
tests/test_parser.py::test_aggregate_and_function_calls PASSED           [ 27%]
tests/test_parser.py::test_case_expression PASSED                        [ 33%]
tests/test_parser.py::test_window_calls PASSED                           [ 38%]
tests/test_parser.py::test_union_and_union_all PASSED                    [ 44%]
tests/test_parser.py::test_insert_values PASSED                          [ 50%]
tests/test_parser.py::test_update_statement PASSED                       [ 55%]
tests/test_parser.py::test_delete_statement PASSED                       [ 61%]
tests/test_parser.py::test_create_table_statement PASSED                 [ 66%]
tests/test_parser.py::test_drop_table_statement PASSED                   [ 72%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT FROM users] PASSED [ 77%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT * FROM users WHERE] PASSED [ 83%]
tests/test_parser.py::test_malformed_input_raises_parse_error[SELECT * FROM users LEFT JOIN orders] PASSED [ 88%]
tests/test_parser.py::test_malformed_input_raises_parse_error[INSERT INTO users VALUES (1,] PASSED [ 94%]
tests/test_parser.py::test_malformed_input_raises_parse_error[CREATE TABLE users (id)] PASSED [100%]

============================== 18 passed in 0.06s ==============================

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: src/queryweave/__init__.py, src/queryweave/parser/__init__.py
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_edge_cases` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `behavior_backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_visible_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `regression_reference_area_preserved` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_positive_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_coverage_negative_path` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `test_integration_with_existing_workflow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_no_unrelated_public_api_changes` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_simple_control_flow` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `dependency_and_environment_fit` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `observable_output_contracts` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

