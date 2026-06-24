# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 2
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| rope-new-repo-root__2198416b3772 | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| rope-new-repo-root__2198416b3772 | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| rope-new-repo-root__2198416b3772 | codex | openai/gpt-5.5 | high | rope-new-repo-root__2198416b3772__9GXnAJj | no | 17/20 | patch_specific 5/6, regular 12/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass |
| rope-new-repo-root__2198416b3772 | codex | openai/gpt-5.5 | high | rope-new-repo-root__2198416b3772__ecFUjeC | no | 17/20 | patch_specific 5/6, regular 12/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base, visible_regression_tests_pass |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>rope-new-repo-root__2198416b3772__9GXnAJj: FAIL, score 0.000, criteria 17/20</summary>

- Task: `rope-new-repo-root__2198416b3772`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 17/20
- Categories: patch_specific 5/6, regular 12/14
- Blocker failures: `hidden_reference_tests_pass`, `submitted_tests_fail_on_base`, `visible_regression_tests_pass`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
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
hidden reference tests: `pytest` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/frontiercode-hidden-tests-mc9dfxbn/repo
collected 0 items / 2 errors

==================================== ERRORS ====================================
________________ ERROR collecting ropetest/advanced_oi_test.py _________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-mc9dfxbn/repo/ropetest/advanced_oi_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base.libutils import path_to_resource
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
_________ ERROR collecting ropetest/refactor/change_signature_test.py __________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-mc9dfxbn/repo/ropetest/refactor/change_signature_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base.libutils import path_to_resource
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
=============================== warnings summary ===============================
rope/base/project.py:31
  /tmp/frontiercode-hidden-tests-mc9dfxbn/repo/rope/base/project.py:31: SyntaxWarning: invalid escape sequence '\s'
    get nonexistent `Resource`\s.

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR ropetest/advanced_oi_test.py
ERROR ropetest/refactor/change_signature_test.py
!!!!!!!!!!!!!!!!!!! Interrupted: 2 errors during collection !!!!!!!!!!!!!!!!!!!!
========================= 1 warning, 2 errors in 0.11s =========================

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
No submitted visible test changes were found to replay against the base snapshot.
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `pytest` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/frontiercode-visible-tests-vx2ieb4k/repo
collected 0 items / 2 errors

==================================== ERRORS ====================================
________________ ERROR collecting ropetest/advanced_oi_test.py _________________
ImportError while importing test module '/tmp/frontiercode-visible-tests-vx2ieb4k/repo/ropetest/advanced_oi_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base.libutils import path_to_resource
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
_________ ERROR collecting ropetest/refactor/change_signature_test.py __________
ImportError while importing test module '/tmp/frontiercode-visible-tests-vx2ieb4k/repo/ropetest/refactor/change_signature_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base.libutils import path_to_resource
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
=============================== warnings summary ===============================
rope/base/project.py:31
  /tmp/frontiercode-visible-tests-vx2ieb4k/repo/rope/base/project.py:31: SyntaxWarning: invalid escape sequence '\s'
    get nonexistent `Resource`\s.

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR ropetest/advanced_oi_test.py
ERROR ropetest/refactor/change_signature_test.py
!!!!!!!!!!!!!!!!!!! Interrupted: 2 errors during collection !!!!!!!!!!!!!!!!!!!!
========================= 1 warning, 2 errors in 0.09s =========================

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: rope/contrib/codeassist.py, ropetest/contrib/codeassisttest.py
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
<summary>rope-new-repo-root__2198416b3772__ecFUjeC: FAIL, score 0.000, criteria 17/20</summary>

- Task: `rope-new-repo-root__2198416b3772`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 17/20
- Categories: patch_specific 5/6, regular 12/14
- Blocker failures: `hidden_reference_tests_pass`, `submitted_tests_fail_on_base`, `visible_regression_tests_pass`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 1.000 | yes |
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
hidden reference tests: `pytest` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/frontiercode-hidden-tests-unklsrjw/repo
collected 0 items / 2 errors

==================================== ERRORS ====================================
________________ ERROR collecting ropetest/advanced_oi_test.py _________________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-unklsrjw/repo/ropetest/advanced_oi_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base import libutils
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
_________ ERROR collecting ropetest/refactor/change_signature_test.py __________
ImportError while importing test module '/tmp/frontiercode-hidden-tests-unklsrjw/repo/ropetest/refactor/change_signature_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base import libutils
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
=============================== warnings summary ===============================
rope/base/project.py:31
  /tmp/frontiercode-hidden-tests-unklsrjw/repo/rope/base/project.py:31: SyntaxWarning: invalid escape sequence '\s'
    get nonexistent `Resource`\s.

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR ropetest/advanced_oi_test.py
ERROR ropetest/refactor/change_signature_test.py
!!!!!!!!!!!!!!!!!!! Interrupted: 2 errors during collection !!!!!!!!!!!!!!!!!!!!
========================= 1 warning, 2 errors in 0.11s =========================

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
No submitted visible test changes were found to replay against the base snapshot.
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `pytest` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/frontiercode-visible-tests-7d62ef0u/repo
collected 0 items / 2 errors

==================================== ERRORS ====================================
________________ ERROR collecting ropetest/advanced_oi_test.py _________________
ImportError while importing test module '/tmp/frontiercode-visible-tests-7d62ef0u/repo/ropetest/advanced_oi_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base import libutils
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
_________ ERROR collecting ropetest/refactor/change_signature_test.py __________
ImportError while importing test module '/tmp/frontiercode-visible-tests-7d62ef0u/repo/ropetest/refactor/change_signature_test.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ropetest/__init__.py:4: in <module>
    import ropetest.projecttest
ropetest/projecttest.py:9: in <module>
    from rope.base import libutils
rope/base/libutils.py:4: in <module>
    import rope.base.project
rope/base/project.py:1: in <module>
    import cPickle as pickle
E   ModuleNotFoundError: No module named 'cPickle'
=============================== warnings summary ===============================
rope/base/project.py:31
  /tmp/frontiercode-visible-tests-7d62ef0u/repo/rope/base/project.py:31: SyntaxWarning: invalid escape sequence '\s'
    get nonexistent `Resource`\s.

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR ropetest/advanced_oi_test.py
ERROR ropetest/refactor/change_signature_test.py
!!!!!!!!!!!!!!!!!!! Interrupted: 2 errors during collection !!!!!!!!!!!!!!!!!!!!
========================= 1 warning, 2 errors in 0.10s =========================

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: rope/base/default_config.py, rope/base/libutils.py, rope/base/project.py, ropetest/projecttest.py
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

