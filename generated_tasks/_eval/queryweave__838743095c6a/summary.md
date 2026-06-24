# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 1
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | 1 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | 1 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| queryweave__838743095c6a | codex | openai/gpt-5.5 | high | queryweave__838743095c6a__tVcfAcm | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>queryweave__838743095c6a__tVcfAcm: FAIL, score 0.000, criteria 18/20</summary>

- Task: `queryweave__838743095c6a`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
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
rootdir: /tmp/frontiercode-hidden-tests-jrestdmq/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-jrestdmq/repo/tests/test_parser.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:60: in <module>
    M = _load_parser_modules()
        ^^^^^^^^^^^^^^^^^^^^^^
tests/test_parser.py:22: in _load_parser_modules
    from queryweave.parser.parser import ParseError, parse
E   ImportError: cannot import name 'ParseError' from 'queryweave.parser.parser' (/tmp/frontiercode-hidden-tests-jrestdmq/repo/src/queryweave/parser/parser.py)
=========================== short test summary info ============================
ERROR tests/test_parser.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.08s ===============================

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
rootdir: /tmp/frontiercode-reverse-classical-c4o8yfiu/repo
configfile: pyproject.toml
collecting ... collected 0 items / 1 error

==================================== ERRORS ====================================
____________________ ERROR collecting tests/test_parser.py _____________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-c4o8yfiu/repo/tests/test_parser.py'.
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
rootdir: /tmp/frontiercode-visible-tests-gel4wy2p/repo
configfile: pyproject.toml
collecting ... collected 12 items

tests/test_parser.py::test_parse_simple_and_aliased_select_list PASSED   [  8%]
tests/test_parser.py::test_parser_accepts_lexer_and_token_stream_inputs PASSED [ 16%]
tests/test_parser.py::test_where_expressions_and_precedence PASSED       [ 25%]
tests/test_parser.py::test_joins_with_on_clauses PASSED                  [ 33%]
tests/test_parser.py::test_group_by_having_order_by_limit_offset PASSED  [ 41%]
tests/test_parser.py::test_aggregate_and_ordinary_function_calls PASSED  [ 50%]
tests/test_parser.py::test_predicate_expressions PASSED                  [ 58%]
tests/test_parser.py::test_malformed_or_out_of_scope_input_raises_parser_error[INSERT INTO users VALUES (1)] PASSED [ 66%]
tests/test_parser.py::test_malformed_or_out_of_scope_input_raises_parser_error[SELECT id FROM users UNION SELECT id FROM admins] PASSED [ 75%]
tests/test_parser.py::test_malformed_or_out_of_scope_input_raises_parser_error[SELECT id FROM users JOIN orders] PASSED [ 83%]
tests/test_parser.py::test_malformed_or_out_of_scope_input_raises_parser_error[SELECT id FROM users WHERE id IN ()] PASSED [ 91%]
tests/test_parser.py::test_malformed_or_out_of_scope_input_raises_parser_error[SELECT id FROM users LIMIT 1.5] PASSED [100%]

============================== 12 passed in 0.04s ==============================

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

