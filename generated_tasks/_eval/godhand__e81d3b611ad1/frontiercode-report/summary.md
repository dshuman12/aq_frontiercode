# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | godhand__e81d3b611ad1__5HfqjDE | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | godhand__e81d3b611ad1__R8pd3Vj | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | godhand__e81d3b611ad1__ekvjoK9 | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | godhand__e81d3b611ad1__to9BYys | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |
| godhand__e81d3b611ad1 | codex | openai/gpt-5.5 | high | godhand__e81d3b611ad1__yirq4PK | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, scope_matches_reference_intent |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>godhand__e81d3b611ad1__5HfqjDE: FAIL, score 0.000, criteria 18/20</summary>

- Task: `godhand__e81d3b611ad1`
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
No reference test files were extracted from the fix commit.
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
......F.............                                                     [100%]
=================================== FAILURES ===================================
_______________ test_login_cookies_use_configured_shared_domain ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0xffff83a6a6f0>

    def test_login_cookies_use_configured_shared_domain(monkeypatch):
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", ".example.com")
        reset_settings_cache()
        app = create_app()
    
        with TestClient(app, base_url="https://api.example.com") as domain_client:
            register_user(domain_client, email="shareddomain@example.com", password="StrongPass123")
            anon_csrf = get_anon_csrf(domain_client)
            response = domain_client.post(
                "/api/v1/auth/login",
                json={"identifier": "shareddomain@example.com", "password": "StrongPass123"},
                headers={"X-CSRF-TOKEN": anon_csrf},
            )
            assert response.status_code == 200
    
            set_cookie_headers = _set_cookie_headers(response)
            auth_cookie_headers = [
                header
                for header in set_cookie_headers
                if header.startswith(
                    (
                        "access_token_cookie=",
                        "refresh_token_cookie=",
                        "csrf_access_token=",
                        "csrf_refresh_token=",
                    )
                )
            ]
            assert len(auth_cookie_headers) == 4
>           assert all("Domain=.example.com" in header for header in auth_cookie_headers)
E           assert False
E            +  where False = all(<generator object test_login_cookies_use_configured_shared_domain.<locals>.<genexpr> at 0xffff83a992f0>)

server/tests/test_auth_user_flow.py:158: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 04:37:37,403 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 04:37:37,403 - app - INFO - create_app:46 - Registered middleware [0.00001s]
2026-06-18 04:37:37,403 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 04:37:37,408 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 04:37:37,409 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 04:37:37,491 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 04:37:37,491 - app - INFO - create_app:67 - Initialized services [0.08294s]
2026-06-18 04:37:37,492 - app - INFO - create_app:70 - Total initialization time: [0.08874s]
2026-06-18 04:37:37,495 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 04:37:37,577 - app - INFO - register_user:155 - User registered: email=shareddomain@example.com
2026-06-18 04:37:37,578 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 04:37:37,659 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a337611fa4890ad1da63fcf
2026-06-18 04:37:37,659 - app - INFO - login_user:188 - User logged in: identifier=shareddomain@example.com
------------------------------ Captured log call -------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00001s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.08294s]
INFO     app:app.py:70 Total initialization time: [0.08874s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=shareddomain@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a337611fa4890ad1da63fcf
INFO     app:auth.py:188 User logged in: identifier=shareddomain@example.com
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_login_cookies_use_configured_shared_domain - assert False
 +  where False = all(<generator object test_login_cookies_use_configured_shared_domain.<locals>.<genexpr> at 0xffff83a992f0>)
1 failed, 19 passed in 4.82s

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
20 passed in 4.84s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: server/api/security/cookies.py, server/tests/conftest.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__e81d3b611ad1__R8pd3Vj: FAIL, score 0.000, criteria 18/20</summary>

- Task: `godhand__e81d3b611ad1`
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
No reference test files were extracted from the fix commit.
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
......F.............                                                     [100%]
=================================== FAILURES ===================================
________________ test_auth_cookies_use_configured_shared_domain ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0xffffa82cef00>

    def test_auth_cookies_use_configured_shared_domain(monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", ".example.com")
        reset_settings_cache()
    
        with TestClient(create_app(), base_url="https://api.example.com") as domain_client:
            register_user(domain_client, email="shareddomain@example.com", password="StrongPass123")
    
            anon_csrf = get_anon_csrf(domain_client)
            login_response = domain_client.post(
                "/api/v1/auth/login",
                json={"identifier": "shareddomain@example.com", "password": "StrongPass123"},
                headers={"X-CSRF-TOKEN": anon_csrf},
            )
            assert login_response.status_code == 200
    
            for cookie_name in _AUTH_COOKIE_NAMES:
                header = _cookie_header(login_response, cookie_name).lower()
>               assert "domain=.example.com" in header
E               AssertionError: assert 'domain=.example.com' in 'access_token_cookie=eyjhbgcioijiuzi1niisinr5cci6ikpxvcj9.eyjzdwiioii2ytmznzu2nmviyja0zjq5nthhzduxzgmilcj0exblijoiywnj...jctytc1ys1imzk5zjyxodk3nzeifq.n1iw3uka30yp2j7fcitm0-p5-xli9cd5reyeykq3hfc; httponly; max-age=900; path=/; samesite=lax'

server/tests/test_auth_user_flow.py:141: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 04:34:46,542 - app - INFO - create_app:41 - Registered error handlers [0.00000s]
2026-06-18 04:34:46,542 - app - INFO - create_app:46 - Registered middleware [0.00001s]
2026-06-18 04:34:46,542 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 04:34:46,547 - app - INFO - create_app:60 - Registered routers [0.00s]
2026-06-18 04:34:46,547 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 04:34:46,621 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 04:34:46,621 - app - INFO - create_app:67 - Initialized services [0.07359s]
2026-06-18 04:34:46,621 - app - INFO - create_app:70 - Total initialization time: [0.07893s]
2026-06-18 04:34:46,622 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 04:34:46,697 - app - INFO - register_user:155 - User registered: email=shareddomain@example.com
2026-06-18 04:34:46,698 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 04:34:46,773 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a337566ebb04f4958ad51dc
2026-06-18 04:34:46,773 - app - INFO - login_user:188 - User logged in: identifier=shareddomain@example.com
------------------------------ Captured log call -------------------------------
INFO     app:app.py:41 Registered error handlers [0.00000s]
INFO     app:app.py:46 Registered middleware [0.00001s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07359s]
INFO     app:app.py:70 Total initialization time: [0.07893s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=shareddomain@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a337566ebb04f4958ad51dc
INFO     app:auth.py:188 User logged in: identifier=shareddomain@example.com
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_auth_cookies_use_configured_shared_domain - AssertionError: assert 'domain=.example.com' in 'access_token_cookie=eyjhbgcioijiuzi1niisinr5cci6ikpxvcj9.eyjzdwiioii2ytmznzu2nmviyja0zjq5nthhzduxzgmilcj0exblijoiywnj...jctytc1ys1imzk5zjyxodk3nzeifq.n1iw3uka30yp2j7fcitm0-p5-xli9cd5reyeykq3hfc; httponly; max-age=900; path=/; samesite=lax'
1 failed, 19 passed in 4.60s

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
20 passed in 4.55s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: server/api/security/cookies.py, server/tests/conftest.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__e81d3b611ad1__ekvjoK9: FAIL, score 0.000, criteria 18/20</summary>

- Task: `godhand__e81d3b611ad1`
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
No reference test files were extracted from the fix commit.
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
......F.............                                                     [100%]
=================================== FAILURES ===================================
________________ test_auth_cookies_use_configured_shared_domain ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0xffff9e19aab0>

    def test_auth_cookies_use_configured_shared_domain(monkeypatch):
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", " .Example.COM ")
        reset_settings_cache()
>       assert get_app_config().JWT_COOKIE_DOMAIN == ".example.com"
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
E       AttributeError: 'TestingConfig' object has no attribute 'JWT_COOKIE_DOMAIN'. Did you mean: 'JWT_COOKIE_SAMESITE'?

server/tests/test_auth_user_flow.py:158: AttributeError
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_auth_cookies_use_configured_shared_domain - AttributeError: 'TestingConfig' object has no attribute 'JWT_COOKIE_DOMAIN'. Did you mean: 'JWT_COOKIE_SAMESITE'?
1 failed, 19 passed in 4.47s

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
20 passed in 4.84s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: server/api/security/cookies.py, server/tests/conftest.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__e81d3b611ad1__to9BYys: FAIL, score 0.000, criteria 18/20</summary>

- Task: `godhand__e81d3b611ad1`
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
No reference test files were extracted from the fix commit.
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
......F.............                                                     [100%]
=================================== FAILURES ===================================
________________ test_auth_cookies_use_configured_shared_domain ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0xffff93bd19a0>

    def test_auth_cookies_use_configured_shared_domain(monkeypatch):
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", ".example.com")
        reset_settings_cache()
    
        app = create_app()
        with TestClient(app, base_url="http://api.example.com") as domain_client:
            csrf_response = domain_client.get("/api/v1/auth/csrf-token")
            assert csrf_response.status_code == 200
            anon_csrf = csrf_response.json()["csrf_token"]
>           _assert_cookie_domain(csrf_response, ("anon_csrf",), ".example.com")

server/tests/test_auth_user_flow.py:165: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

response = <Response [200 OK]>, cookie_names = ('anon_csrf',)
expected_domain = '.example.com'

    def _assert_cookie_domain(
        response,
        cookie_names: tuple[str, ...],
        expected_domain: str | None,
    ) -> None:
        for cookie_name in cookie_names:
            headers = _set_cookie_headers_for(response, cookie_name)
            assert headers, f"Missing Set-Cookie header for {cookie_name}"
            for header in headers:
                normalized_header = header.lower()
                if expected_domain is None:
                    assert "domain=" not in normalized_header
                else:
>                   assert f"domain={expected_domain.lower()}" in normalized_header
E                   AssertionError: assert 'domain=.example.com' in 'anon_csrf=lj6bnouuccvvmb5vrzfbg2w2lznpzb9qflycgok0kqk; max-age=14400; path=/; samesite=lax'

server/tests/test_auth_user_flow.py:46: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 04:34:50,338 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 04:34:50,338 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 04:34:50,338 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 04:34:50,346 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 04:34:50,346 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 04:34:50,420 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 04:34:50,420 - app - INFO - create_app:67 - Initialized services [0.07434s]
2026-06-18 04:34:50,420 - app - INFO - create_app:70 - Total initialization time: [0.08297s]
2026-06-18 04:34:50,422 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07434s]
INFO     app:app.py:70 Total initialization time: [0.08297s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_auth_cookies_use_configured_shared_domain - AssertionError: assert 'domain=.example.com' in 'anon_csrf=lj6bnouuccvvmb5vrzfbg2w2lznpzb9qflycgok0kqk; max-age=14400; path=/; samesite=lax'
1 failed, 19 passed in 4.45s

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
20 passed in 5.03s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: server/api/security/cookies.py, server/tests/conftest.py, server/tests/test_auth_user_flow.py
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
<summary>godhand__e81d3b611ad1__yirq4PK: FAIL, score 0.000, criteria 18/20</summary>

- Task: `godhand__e81d3b611ad1`
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
No reference test files were extracted from the fix commit.
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend-auth` exited 2
STDOUT:
./server/scripts/test.sh server/tests/test_auth_user_flow.py
......F.............                                                     [100%]
=================================== FAILURES ===================================
________________ test_auth_cookies_use_configured_shared_domain ________________

monkeypatch = <_pytest.monkeypatch.MonkeyPatch object at 0xffff98732480>

    def test_auth_cookies_use_configured_shared_domain(monkeypatch):
        cookie_domain = ".example.com"
        monkeypatch.setenv("JWT_COOKIE_DOMAIN", cookie_domain)
        reset_settings_cache()
    
        app = create_app()
        with TestClient(app, base_url="https://api.example.com") as test_client:
            csrf_response = test_client.get("/api/v1/auth/csrf-token")
            assert csrf_response.status_code == 200
>           _assert_cookie_domain(csrf_response, "anon_csrf", cookie_domain)

server/tests/test_auth_user_flow.py:156: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

response = <Response [200 OK]>, cookie_name = 'anon_csrf'
expected_domain = '.example.com'

    def _assert_cookie_domain(response, cookie_name: str, expected_domain: str) -> None:
        headers = _cookie_headers(response, cookie_name)
        assert headers, f"missing Set-Cookie header for {cookie_name}"
>       assert any(f"domain={expected_domain.lower()}" in header.lower() for header in headers)
E       assert False
E        +  where False = any(<generator object _assert_cookie_domain.<locals>.<genexpr> at 0xffff98767920>)

server/tests/test_auth_user_flow.py:41: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 04:34:51,759 - app - INFO - create_app:41 - Registered error handlers [0.00001s]
2026-06-18 04:34:51,759 - app - INFO - create_app:46 - Registered middleware [0.00000s]
2026-06-18 04:34:51,759 - app - INFO - create_app:51 - Initialized auth rate limiter [0.00001s]
2026-06-18 04:34:51,764 - app - INFO - create_app:60 - Registered routers [0.01s]
2026-06-18 04:34:51,764 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 04:34:51,839 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 04:34:51,839 - app - INFO - create_app:67 - Initialized services [0.07447s]
2026-06-18 04:34:51,839 - app - INFO - create_app:70 - Total initialization time: [0.08000s]
2026-06-18 04:34:51,841 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
------------------------------ Captured log call -------------------------------
INFO     app:app.py:41 Registered error handlers [0.00001s]
INFO     app:app.py:46 Registered middleware [0.00000s]
INFO     app:app.py:51 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:60 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:67 Initialized services [0.07447s]
INFO     app:app.py:70 Total initialization time: [0.08000s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
=========================== short test summary info ============================
FAILED server/tests/test_auth_user_flow.py::test_auth_cookies_use_configured_shared_domain - assert False
 +  where False = any(<generator object _assert_cookie_domain.<locals>.<genexpr> at 0xffff98767920>)
1 failed, 19 passed in 4.42s

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
20 passed in 5.04s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: server/api/security/cookies.py, server/tests/test_auth_user_flow.py
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

