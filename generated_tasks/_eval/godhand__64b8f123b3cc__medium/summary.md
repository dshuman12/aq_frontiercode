# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | godhand__64b8f123b3cc__medium__52uwpFe | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | godhand__64b8f123b3cc__medium__CYReV2o | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | godhand__64b8f123b3cc__medium__XrgHL7d | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | godhand__64b8f123b3cc__medium__YTncGgU | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| godhand__64b8f123b3cc | codex | openai/gpt-5.5 | high | godhand__64b8f123b3cc__medium__ntM95Yn | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>godhand__64b8f123b3cc__medium__52uwpFe: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__64b8f123b3cc`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
...................                                                      [100%]
19 passed in 4.27s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
FF..................                                                     [100%]
=================================== FAILURES ===================================
_______________ test_csrf_returns_empty_strings_without_cookies ________________

client = <starlette.testclient.TestClient object at 0xffff99350080>

    def test_csrf_returns_empty_strings_without_cookies(client):
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:16: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:54,050 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:54,050 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:54,050 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:54,055 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:54,055 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:54,129 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:54,129 - app - INFO - create_app:67 - Initialized services [0.07380s]
2026-06-18 06:33:54,129 - app - INFO - create_app:70 - Total initialization time: [0.07903s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07380s]
INFO     app:app.py:70 Total initialization time: [0.07903s]
____________________ test_csrf_returns_tokens_from_cookies _____________________

client = <starlette.testclient.TestClient object at 0xffff992ab0b0>

    def test_csrf_returns_tokens_from_cookies(client):
        anon_csrf = get_anon_csrf(client)
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:27: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:54,154 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:54,154 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:54,155 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:54,159 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:54,159 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:54,233 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:54,233 - app - INFO - create_app:67 - Initialized services [0.07344s]
2026-06-18 06:33:54,233 - app - INFO - create_app:70 - Total initialization time: [0.07867s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07344s]
INFO     app:app.py:70 Total initialization time: [0.07867s]
----------------------------- Captured stdout call -----------------------------
2026-06-18 06:33:54,235 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:csrf.py:24 Issued anonymous CSRF token
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_csrf_returns_empty_strings_without_cookies - assert 404 == 200
 +  where 404 = <Response [404 Not Found]>.status_code
FAILED server/tests/test_auth_user_flow.py::test_csrf_returns_tokens_from_cookies - assert 404 == 200
 +  where 404 = <Response [404 Not Found]>.status_code
2 failed, 18 passed in 4.23s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:7: test-backend-auth] Error 1
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
....................                                                     [100%]
20 passed in 4.37s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/auth.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__64b8f123b3cc__medium__CYReV2o: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__64b8f123b3cc`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
...................                                                      [100%]
19 passed in 4.56s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
.FFF.................                                                    [100%]
=================================== FAILURES ===================================
_____________ test_get_csrf_returns_empty_strings_without_cookies ______________

client = <starlette.testclient.TestClient object at 0xffff82f62420>

    def test_get_csrf_returns_empty_strings_without_cookies(client):
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:39: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:35:29,142 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:35:29,142 - app - INFO - create_app:46 - Registered middleware [0.00001s]
2026-06-18 06:35:29,142 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:35:29,148 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 06:35:29,148 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:35:29,224 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:35:29,224 - app - INFO - create_app:67 - Initialized services [0.07609s]
2026-06-18 06:35:29,224 - app - INFO - create_app:70 - Total initialization time: [0.08225s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00001s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07609s]
INFO     app:app.py:70 Total initialization time: [0.08225s]
_________________ test_get_csrf_returns_anonymous_csrf_cookie __________________

client = <starlette.testclient.TestClient object at 0xffff82e51bb0>

    def test_get_csrf_returns_anonymous_csrf_cookie(client):
        anon_csrf = get_anon_csrf(client)
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:51: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:35:29,250 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:35:29,250 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:35:29,250 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:35:29,255 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 06:35:29,255 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:35:29,331 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:35:29,331 - app - INFO - create_app:67 - Initialized services [0.07577s]
2026-06-18 06:35:29,331 - app - INFO - create_app:70 - Total initialization time: [0.08140s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07577s]
INFO     app:app.py:70 Total initialization time: [0.08140s]
----------------------------- Captured stdout call -----------------------------
2026-06-18 06:35:29,333 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:csrf.py:24 Issued anonymous CSRF token
_______________ test_get_csrf_returns_authenticated_csrf_cookies _______________

client = <starlette.testclient.TestClient object at 0xffff82f1a690>

    def test_get_csrf_returns_authenticated_csrf_cookies(client):
        register_user(client, email="csrfendpoint@example.com", password="StrongPass123")
        login_user(client, email="csrfendpoint@example.com", password="StrongPass123")
        access_csrf = get_auth_csrf(client)
        refresh_csrf = get_refresh_csrf(client)
    
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:66: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:35:29,339 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:35:29,339 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:35:29,340 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:35:29,344 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:35:29,345 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:35:29,420 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:35:29,420 - app - INFO - create_app:67 - Initialized services [0.07549s]
2026-06-18 06:35:29,420 - app - INFO - create_app:70 - Total initialization time: [0.08071s]
------------------------------ Captured log setup ------------------------------
INFO
...<truncated>...
STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:7: test-backend-auth] Error 1
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
.....................                                                    [100%]
21 passed in 4.83s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/auth.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__64b8f123b3cc__medium__XrgHL7d: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__64b8f123b3cc`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
...................                                                      [100%]
19 passed in 4.26s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
FFF..................                                                    [100%]
=================================== FAILURES ===================================
________ test_get_csrf_tokens_returns_empty_strings_when_cookies_absent ________

client = <starlette.testclient.TestClient object at 0xffffa2f18260>

    def test_get_csrf_tokens_returns_empty_strings_when_cookies_absent(client):
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:16: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,500 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,500 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,500 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00002s]
2026-06-18 06:33:41,505 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:41,505 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,578 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,578 - app - INFO - create_app:67 - Initialized services [0.07349s]
2026-06-18 06:33:41,578 - app - INFO - create_app:70 - Total initialization time: [0.07874s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00002s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07349s]
INFO     app:app.py:70 Total initialization time: [0.07874s]
______________ test_get_csrf_tokens_returns_anonymous_csrf_cookie ______________

client = <starlette.testclient.TestClient object at 0xffffa2e7f440>

    def test_get_csrf_tokens_returns_anonymous_csrf_cookie(client):
        anon_csrf = get_anon_csrf(client)
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:27: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,602 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,603 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,603 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:41,608 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:41,608 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,681 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,681 - app - INFO - create_app:67 - Initialized services [0.07360s]
2026-06-18 06:33:41,681 - app - INFO - create_app:70 - Total initialization time: [0.07886s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07360s]
INFO     app:app.py:70 Total initialization time: [0.07886s]
----------------------------- Captured stdout call -----------------------------
2026-06-18 06:33:41,683 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:csrf.py:24 Issued anonymous CSRF token
___________ test_get_csrf_tokens_returns_authenticated_csrf_cookies ____________

client = <starlette.testclient.TestClient object at 0xffffa2fb6840>

    def test_get_csrf_tokens_returns_authenticated_csrf_cookies(client):
        register_user(client, email="csrf-read@example.com", password="StrongPass123")
        login_user(client, email="csrf-read@example.com", password="StrongPass123")
        access_csrf = get_auth_csrf(client)
        refresh_csrf = get_refresh_csrf(client)
    
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:42: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,688 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,688 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,688 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:41,693 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:41,693 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,766 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,766 - app - INFO - create_app:67 - Initialized services [0.07313s]
2026-06-18 06:33:41,766 - app - INFO - create_app:70 - Total initialization time: [0.07825s]
------------------------------ Captured log setup --------------------
...<truncated>...
STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:7: test-backend-auth] Error 1
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
.....................                                                    [100%]
21 passed in 4.43s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/auth.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__64b8f123b3cc__medium__YTncGgU: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__64b8f123b3cc`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
...................                                                      [100%]
19 passed in 4.28s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
.FF.................                                                     [100%]
=================================== FAILURES ===================================
_____________ test_csrf_returns_empty_strings_when_cookies_absent ______________

client = <starlette.testclient.TestClient object at 0xffff91de6570>

    def test_csrf_returns_empty_strings_when_cookies_absent(client):
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:39: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:50,720 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:50,720 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:50,720 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:50,725 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:50,725 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:50,799 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:50,799 - app - INFO - create_app:67 - Initialized services [0.07387s]
2026-06-18 06:33:50,799 - app - INFO - create_app:70 - Total initialization time: [0.07907s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07387s]
INFO     app:app.py:70 Total initialization time: [0.07907s]
___________________ test_csrf_returns_current_cookie_tokens ____________________

client = <starlette.testclient.TestClient object at 0xffff91d419a0>

    def test_csrf_returns_current_cookie_tokens(client):
        anon_csrf = get_anon_csrf(client)
        anonymous_response = client.get("/api/v1/auth/csrf")
>       assert anonymous_response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:50: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:50,822 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:50,822 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:50,823 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:50,827 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:50,828 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:50,901 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:50,901 - app - INFO - create_app:67 - Initialized services [0.07322s]
2026-06-18 06:33:50,901 - app - INFO - create_app:70 - Total initialization time: [0.07844s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07322s]
INFO     app:app.py:70 Total initialization time: [0.07844s]
----------------------------- Captured stdout call -----------------------------
2026-06-18 06:33:50,903 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:csrf.py:24 Issued anonymous CSRF token
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_csrf_returns_empty_strings_when_cookies_absent - assert 404 == 200
 +  where 404 = <Response [404 Not Found]>.status_code
FAILED server/tests/test_auth_user_flow.py::test_csrf_returns_current_cookie_tokens - assert 404 == 200
 +  where 404 = <Response [404 Not Found]>.status_code
2 failed, 18 passed in 4.25s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:7: test-backend-auth] Error 1
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
....................                                                     [100%]
20 passed in 4.34s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/auth.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__64b8f123b3cc__medium__ntM95Yn: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__64b8f123b3cc`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: yes
- Score: 1.000
- Reward: 1.000
- Criteria: 20/20
- Categories: patch_specific 6/6, regular 14/14
- Blocker failures: none

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
...................                                                      [100%]
19 passed in 4.25s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
FFF..................                                                    [100%]
=================================== FAILURES ===================================
___________ test_csrf_endpoint_returns_empty_strings_without_cookies ___________

client = <starlette.testclient.TestClient object at 0xffff7e2ec320>

    def test_csrf_endpoint_returns_empty_strings_without_cookies(client):
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:16: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,562 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,562 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,562 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:41,567 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 06:33:41,568 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,641 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,641 - app - INFO - create_app:67 - Initialized services [0.07377s]
2026-06-18 06:33:41,641 - app - INFO - create_app:70 - Total initialization time: [0.07927s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07377s]
INFO     app:app.py:70 Total initialization time: [0.07927s]
_______________ test_csrf_endpoint_returns_anonymous_csrf_cookie _______________

client = <starlette.testclient.TestClient object at 0xffff7e25b6b0>

    def test_csrf_endpoint_returns_anonymous_csrf_cookie(client):
        anon_csrf = get_anon_csrf(client)
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:27: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,666 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,666 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,666 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:41,671 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:41,671 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,744 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,744 - app - INFO - create_app:67 - Initialized services [0.07305s]
2026-06-18 06:33:41,744 - app - INFO - create_app:70 - Total initialization time: [0.07829s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07305s]
INFO     app:app.py:70 Total initialization time: [0.07829s]
----------------------------- Captured stdout call -----------------------------
2026-06-18 06:33:41,746 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:csrf.py:24 Issued anonymous CSRF token
____________ test_csrf_endpoint_returns_authenticated_csrf_cookies _____________

client = <starlette.testclient.TestClient object at 0xffff7e3ae9c0>

    def test_csrf_endpoint_returns_authenticated_csrf_cookies(client):
        register_user(client, email="csrfread@example.com", password="StrongPass123")
        login_user(client, email="csrfread@example.com", password="StrongPass123")
    
        response = client.get("/api/v1/auth/csrf")
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404 Not Found]>.status_code

server/tests/test_auth_user_flow.py:40: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-18 06:33:41,751 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 06:33:41,751 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 06:33:41,751 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 06:33:41,756 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 06:33:41,756 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 06:33:41,829 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 06:33:41,829 - app - INFO - create_app:67 - Initialized services [0.07319s]
2026-06-18 06:33:41,829 - app - INFO - create_app:70 - Total initialization time: [0.07831s]
------------------------------ Captured log setup ------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered
...<truncated>...
STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:7: test-backend-auth] Error 1
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend-auth` exited 0
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
.....................                                                    [100%]
21 passed in 4.44s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/auth.py, server/tests/test_auth_user_flow.py
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

