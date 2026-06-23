# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.400 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.400 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | vaultkey__7cc2bdf265bf__4aog28X | no | 3/5 | patch_specific 0/1, regular 3/4 | 0.400 | hidden_auth_tests_pass, scope_matches_auth_area |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | vaultkey__7cc2bdf265bf__XBp8dFT | no | 3/5 | patch_specific 0/1, regular 3/4 | 0.400 | hidden_auth_tests_pass, scope_matches_auth_area |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | vaultkey__7cc2bdf265bf__hitrL99 | no | 3/5 | patch_specific 0/1, regular 3/4 | 0.400 | hidden_auth_tests_pass, scope_matches_auth_area |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | vaultkey__7cc2bdf265bf__izJNN9k | no | 3/5 | patch_specific 0/1, regular 3/4 | 0.400 | hidden_auth_tests_pass, scope_matches_auth_area |
| vaultkey__7cc2bdf265bf | codex | openai/gpt-5.5 | high | vaultkey__7cc2bdf265bf__uTNVQTa | no | 3/5 | patch_specific 0/1, regular 3/4 | 0.400 | hidden_auth_tests_pass, scope_matches_auth_area |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>vaultkey__7cc2bdf265bf__4aog28X: FAIL, score 0.400, criteria 3/5</summary>

- Task: `vaultkey__7cc2bdf265bf`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.400
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 0/1, regular 3/4
- Blocker failures: `hidden_auth_tests_pass`, `scope_matches_auth_area`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_auth_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_auth_area | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| code_quality_maintainable | regular | llm_prompt | no | 0.150 | 1.000 | yes |

Criterion evidence:

#### `hidden_auth_tests_pass` (FAIL, score 0.000)

```text
hidden auth tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-hidden-auth-ppqb7pfy/repo
configfile: pyproject.toml
collected 640 items / 1 error

==================================== ERRORS ====================================
_____________________ ERROR collecting tests/test_auth.py ______________________
ImportError while importing test module '/tmp/vaultkey-hidden-auth-ppqb7pfy/repo/tests/test_auth.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_auth.py:8: in <module>
    from vaultkey.access.auth import (
E   ImportError: cannot import name 'AppRoleBackend' from 'vaultkey.access.auth' (/tmp/vaultkey-hidden-auth-ppqb7pfy/repo/src/vaultkey/access/auth.py)
=========================== short test summary info ============================
ERROR tests/test_auth.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.26s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-visible-qbime9yv/repo
configfile: pyproject.toml
collected 659 items

tests/test_auth.py ...................                                   [  2%]
tests/test_crypto.py ................................................... [ 10%]
........................................................................ [ 21%]
........................................................................ [ 32%]
........................................................................ [ 43%]
............                                                             [ 45%]
tests/test_utils.py .................................................... [ 53%]
........................................................................ [ 64%]
..........................................................               [ 72%]
tests/test_vault.py .................................................... [ 80%]
........................................................................ [ 91%]
.......................................................                  [100%]

============================= 659 passed in 0.76s ==============================

STDERR:
```

#### `scope_matches_auth_area` (FAIL, score 0.000)

```text
Changed-line count exceeds task scope limit
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No hidden grader asset names or fix commit identifiers were found in the agent-visible repo
```

#### `code_quality_maintainable` (PASS, score 1.000)

```text
Non-blocking quality criterion is evaluated by task QA review.
```


</details>

<details>
<summary>vaultkey__7cc2bdf265bf__XBp8dFT: FAIL, score 0.400, criteria 3/5</summary>

- Task: `vaultkey__7cc2bdf265bf`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.400
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 0/1, regular 3/4
- Blocker failures: `hidden_auth_tests_pass`, `scope_matches_auth_area`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_auth_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_auth_area | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| code_quality_maintainable | regular | llm_prompt | no | 0.150 | 1.000 | yes |

Criterion evidence:

#### `hidden_auth_tests_pass` (FAIL, score 0.000)

```text
hidden auth tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-hidden-auth-e0fzn9uf/repo
configfile: pyproject.toml
collected 640 items / 1 error

==================================== ERRORS ====================================
_____________________ ERROR collecting tests/test_auth.py ______________________
ImportError while importing test module '/tmp/vaultkey-hidden-auth-e0fzn9uf/repo/tests/test_auth.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_auth.py:8: in <module>
    from vaultkey.access.auth import (
E   ImportError: cannot import name 'AuthEventLogger' from 'vaultkey.access.auth' (/tmp/vaultkey-hidden-auth-e0fzn9uf/repo/src/vaultkey/access/auth.py)
=========================== short test summary info ============================
ERROR tests/test_auth.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.28s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-visible-6eejcip5/repo
configfile: pyproject.toml
collected 664 items

tests/test_auth.py ........................                              [  3%]
tests/test_crypto.py ................................................... [ 11%]
........................................................................ [ 22%]
........................................................................ [ 32%]
........................................................................ [ 43%]
............                                                             [ 45%]
tests/test_utils.py .................................................... [ 53%]
........................................................................ [ 64%]
..........................................................               [ 73%]
tests/test_vault.py .................................................... [ 80%]
........................................................................ [ 91%]
.......................................................                  [100%]

============================= 664 passed in 0.80s ==============================

STDERR:
```

#### `scope_matches_auth_area` (FAIL, score 0.000)

```text
Changed-line count exceeds task scope limit
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No hidden grader asset names or fix commit identifiers were found in the agent-visible repo
```

#### `code_quality_maintainable` (PASS, score 1.000)

```text
Non-blocking quality criterion is evaluated by task QA review.
```


</details>

<details>
<summary>vaultkey__7cc2bdf265bf__hitrL99: FAIL, score 0.400, criteria 3/5</summary>

- Task: `vaultkey__7cc2bdf265bf`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.400
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 0/1, regular 3/4
- Blocker failures: `hidden_auth_tests_pass`, `scope_matches_auth_area`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_auth_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_auth_area | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| code_quality_maintainable | regular | llm_prompt | no | 0.150 | 1.000 | yes |

Criterion evidence:

#### `hidden_auth_tests_pass` (FAIL, score 0.000)

```text
hidden auth tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-hidden-auth-9hnk8h2c/repo
configfile: pyproject.toml
collected 640 items / 1 error

==================================== ERRORS ====================================
_____________________ ERROR collecting tests/test_auth.py ______________________
ImportError while importing test module '/tmp/vaultkey-hidden-auth-9hnk8h2c/repo/tests/test_auth.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_auth.py:8: in <module>
    from vaultkey.access.auth import (
E   ImportError: cannot import name 'AppRoleBackend' from 'vaultkey.access.auth' (/tmp/vaultkey-hidden-auth-9hnk8h2c/repo/src/vaultkey/access/auth.py)
=========================== short test summary info ============================
ERROR tests/test_auth.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.31s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-visible-ozm4mx07/repo
configfile: pyproject.toml
collected 658 items

tests/test_auth.py ..................                                    [  2%]
tests/test_crypto.py ................................................... [ 10%]
........................................................................ [ 21%]
........................................................................ [ 32%]
........................................................................ [ 43%]
............                                                             [ 45%]
tests/test_utils.py .................................................... [ 53%]
........................................................................ [ 63%]
..........................................................               [ 72%]
tests/test_vault.py .................................................... [ 80%]
........................................................................ [ 91%]
.......................................................                  [100%]

============================= 658 passed in 0.85s ==============================

STDERR:
```

#### `scope_matches_auth_area` (FAIL, score 0.000)

```text
Changed-line count exceeds task scope limit
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No hidden grader asset names or fix commit identifiers were found in the agent-visible repo
```

#### `code_quality_maintainable` (PASS, score 1.000)

```text
Non-blocking quality criterion is evaluated by task QA review.
```


</details>

<details>
<summary>vaultkey__7cc2bdf265bf__izJNN9k: FAIL, score 0.400, criteria 3/5</summary>

- Task: `vaultkey__7cc2bdf265bf`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.400
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 0/1, regular 3/4
- Blocker failures: `hidden_auth_tests_pass`, `scope_matches_auth_area`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_auth_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_auth_area | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| code_quality_maintainable | regular | llm_prompt | no | 0.150 | 1.000 | yes |

Criterion evidence:

#### `hidden_auth_tests_pass` (FAIL, score 0.000)

```text
hidden auth tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-hidden-auth-s0n8v7gi/repo
configfile: pyproject.toml
collected 640 items / 1 error

==================================== ERRORS ====================================
_____________________ ERROR collecting tests/test_auth.py ______________________
ImportError while importing test module '/tmp/vaultkey-hidden-auth-s0n8v7gi/repo/tests/test_auth.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_auth.py:8: in <module>
    from vaultkey.access.auth import (
E   ImportError: cannot import name 'AppRoleBackend' from 'vaultkey.access.auth' (/tmp/vaultkey-hidden-auth-s0n8v7gi/repo/src/vaultkey/access/auth.py)
=========================== short test summary info ============================
ERROR tests/test_auth.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.33s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-visible-q7u8ks7_/repo
configfile: pyproject.toml
collected 659 items

tests/test_auth.py ...................                                   [  2%]
tests/test_crypto.py ................................................... [ 10%]
........................................................................ [ 21%]
........................................................................ [ 32%]
........................................................................ [ 43%]
............                                                             [ 45%]
tests/test_utils.py .................................................... [ 53%]
........................................................................ [ 64%]
..........................................................               [ 72%]
tests/test_vault.py .................................................... [ 80%]
........................................................................ [ 91%]
.......................................................                  [100%]

============================= 659 passed in 0.87s ==============================

STDERR:
```

#### `scope_matches_auth_area` (FAIL, score 0.000)

```text
Changed-line count exceeds task scope limit
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No hidden grader asset names or fix commit identifiers were found in the agent-visible repo
```

#### `code_quality_maintainable` (PASS, score 1.000)

```text
Non-blocking quality criterion is evaluated by task QA review.
```


</details>

<details>
<summary>vaultkey__7cc2bdf265bf__uTNVQTa: FAIL, score 0.400, criteria 3/5</summary>

- Task: `vaultkey__7cc2bdf265bf`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.400
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 0/1, regular 3/4
- Blocker failures: `hidden_auth_tests_pass`, `scope_matches_auth_area`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_auth_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_auth_area | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| code_quality_maintainable | regular | llm_prompt | no | 0.150 | 1.000 | yes |

Criterion evidence:

#### `hidden_auth_tests_pass` (FAIL, score 0.000)

```text
hidden auth tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 2
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-hidden-auth-4ga1ky_k/repo
configfile: pyproject.toml
collected 640 items / 1 error

==================================== ERRORS ====================================
_____________________ ERROR collecting tests/test_auth.py ______________________
ImportError while importing test module '/tmp/vaultkey-hidden-auth-4ga1ky_k/repo/tests/test_auth.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
tests/test_auth.py:8: in <module>
    from vaultkey.access.auth import (
E   ImportError: cannot import name 'AuthSessionManager' from 'vaultkey.access.auth' (/tmp/vaultkey-hidden-auth-4ga1ky_k/repo/src/vaultkey/access/auth.py)
=========================== short test summary info ============================
ERROR tests/test_auth.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.34s ===============================

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression tests: `PYTHONPATH=src python3 -m pytest tests/ -q` exited 0
STDOUT:
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
rootdir: /tmp/vaultkey-visible-6i_horvk/repo
configfile: pyproject.toml
collected 656 items

tests/test_auth.py ................                                      [  2%]
tests/test_crypto.py ................................................... [ 10%]
........................................................................ [ 21%]
........................................................................ [ 32%]
........................................................................ [ 43%]
............                                                             [ 44%]
tests/test_utils.py .................................................... [ 52%]
........................................................................ [ 63%]
..........................................................               [ 72%]
tests/test_vault.py .................................................... [ 80%]
........................................................................ [ 91%]
.......................................................                  [100%]

============================= 656 passed in 0.97s ==============================

STDERR:
```

#### `scope_matches_auth_area` (FAIL, score 0.000)

```text
Changed-line count exceeds task scope limit
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No hidden grader asset names or fix commit identifiers were found in the agent-visible repo
```

#### `code_quality_maintainable` (PASS, score 1.000)

```text
Non-blocking quality criterion is evaluated by task QA review.
```


</details>

