# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 3
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | 3 | 0.000 | 0.722 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | 3 | 0.000 | 0.722 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__j6wjmro | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.583 | hidden_reference_tests_pass, scope_matches_reference_intent |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__tPN8yiJ | no | 19/20 | patch_specific 5/6, regular 14/14 | 0.708 | hidden_reference_tests_pass |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__ubmFGLu | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>godhand__550c995fb17c__j6wjmro: FAIL, score 0.583, criteria 18/20</summary>

- Task: `godhand__550c995fb17c`
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
hidden reference tests: `make test-backend` exited 2
STDOUT:
./server/scripts/test.sh
.................................F......................                 [100%]
=================================== FAILURES ===================================
___________ test_join_returns_default_ws_urls_when_registry_is_empty ___________

    def test_join_returns_default_ws_urls_when_registry_is_empty():
        app = create_app()
        with TestClient(app) as client:
            create_and_login(client, "owner3@example.com")
            lobby = create_lobby(client, "default-routing-lobby", user_capacity=4)
            lobby_id = lobby["_id"]
    
            create_and_login(client, "joiner3@example.com")
            csrf = get_auth_csrf(client)
            response = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
            assert response.status_code == 200, response.text
    
            payload = response.json()
            assert_ws_route(payload["gameWsUrl"], f"/api/v1/ws/game/{lobby_id}")
            assert_ws_route(payload["chatWsUrl"], f"/api/v1/ws/lobby/{lobby_id}")
>           assert payload["lobby"]["assigned_game_server_id"] in {"game-server-default", "test-game-server"}
E           AssertionError: assert 'test-na-west-1' in {'game-server-default', 'test-game-server'}

server/tests/test_lobby_api.py:119: AssertionError
---------------------------- Captured stdout setup -----------------------------
2026-06-22 05:02:07,615 - pymongo - INFO - _seed_mock_users:167 - Seeded default mock users for testing environment
2026-06-22 05:02:07,616 - pymongo - INFO - _seed_mock_game_servers:192 - Seeded default mock game servers for testing environment
------------------------------ Captured log setup ------------------------------
INFO     pymongo:mongo.py:167 Seeded default mock users for testing environment
INFO     pymongo:mongo.py:192 Seeded default mock game servers for testing environment
----------------------------- Captured stdout call -----------------------------
2026-06-22 05:02:07,616 - app - INFO - create_app:39 - Registered error handlers [0.00001s]
2026-06-22 05:02:07,616 - app - INFO - create_app:44 - Registered middleware [0.00005s]
2026-06-22 05:02:07,616 - app - INFO - create_app:49 - Initialized auth rate limiter [0.00001s]
2026-06-22 05:02:07,622 - app - INFO - create_app:58 - Registered routers [0.01s]
2026-06-22 05:02:07,622 - pymongo - INFO - initialize:40 - Initialized mongomock MongoDB client for testing
2026-06-22 05:02:07,703 - pymongo - INFO - _seed_mock_users:167 - Seeded default mock users for testing environment
2026-06-22 05:02:07,703 - pymongo - INFO - _seed_mock_game_servers:192 - Seeded default mock game servers for testing environment
2026-06-22 05:02:07,704 - app - INFO - create_app:63 - Initialized services [0.08184s]
2026-06-22 05:02:07,704 - app - INFO - create_app:66 - Total initialization time: [0.08746s]
2026-06-22 05:02:07,705 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:02:07,788 - app - INFO - register_user:155 - User registered: email=owner3@example.com
2026-06-22 05:02:07,789 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:02:07,871 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a38c1cf327edb267f7c2912
2026-06-22 05:02:07,871 - app - INFO - login_user:188 - User logged in: identifier=owner3@example.com
2026-06-22 05:02:07,873 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:02:07,956 - app - INFO - register_user:155 - User registered: email=joiner3@example.com
2026-06-22 05:02:07,957 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:02:08,039 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a38c1cf327edb267f7c2914
2026-06-22 05:02:08,039 - app - INFO - login_user:188 - User logged in: identifier=joiner3@example.com
------------------------------ Captured log call -------------------------------
INFO     app:app.py:39 Registered error handlers [0.00001s]
INFO     app:app.py:44 Registered middleware [0.00005s]
INFO     app:app.py:49 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:58 Registered routers [0.01s]
INFO     pymongo:mongo.py:40 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:167 Seeded default mock users for testing environment
INFO     pymongo:mongo.py:192 Seeded default mock game servers for testing environment
INFO     app:app.py:63 Initialized services [0.08184s]
INFO     app:app.py:66 Total initialization time: [0.08746s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=owner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a38c1cf327edb267f7c2912
INFO     app:auth.py:188 User logged in: identifier=owner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=joiner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a38c1cf327edb267f7c2914
INFO     app:auth.py:188 User logged in: identifier=joiner3@example.com
=========================== short test summary info ============================
FAILED server/tests/test_lobby_api.py::test_join_returns_default_ws_urls_when_registry_is_empty - AssertionError: assert 'test-na-west-1' in {'game-server-default', 'test-game-server'}
1 failed, 55 passed in 19.80s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:4: test-backend] Error 1
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend` exited 2
STDOUT:
./server/scripts/test.sh

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
ImportError while loading conftest '/tmp/frontiercode-reverse-classical-8_rv7pld/repo/server/tests/conftest.py'.
server/tests/conftest.py:16: in <module>
    from server.api.websockets.lobby_chat import reset_lobby_chat_state_for_tests
E   ImportError: cannot import name 'reset_lobby_chat_state_for_tests' from 'server.api.websockets.lobby_chat' (/tmp/frontiercode-reverse-classical-8_rv7pld/repo/server/api/websockets/lobby_chat.py)
make: *** [Makefile:4: test-backend] Error 4
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
...........................................................              [100%]
59 passed in 29.19s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Too many changed files: 9 > 8
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
<summary>godhand__550c995fb17c__tPN8yiJ: FAIL, score 0.708, criteria 19/20</summary>

- Task: `godhand__550c995fb17c`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.708
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 5/6, regular 14/14
- Blocker failures: `hidden_reference_tests_pass`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
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

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `make test-backend` exited 2
STDOUT:
./server/scripts/test.sh
.................................F......................                 [100%]
=================================== FAILURES ===================================
___________ test_join_returns_default_ws_urls_when_registry_is_empty ___________

    def test_join_returns_default_ws_urls_when_registry_is_empty():
        app = create_app()
        with TestClient(app) as client:
            create_and_login(client, "owner3@example.com")
            lobby = create_lobby(client, "default-routing-lobby", user_capacity=4)
            lobby_id = lobby["_id"]
    
            create_and_login(client, "joiner3@example.com")
            csrf = get_auth_csrf(client)
            response = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
            assert response.status_code == 200, response.text
    
            payload = response.json()
            assert_ws_route(payload["gameWsUrl"], f"/api/v1/ws/game/{lobby_id}")
            assert_ws_route(payload["chatWsUrl"], f"/api/v1/ws/lobby/{lobby_id}")
>           assert payload["lobby"]["assigned_game_server_id"] in {"game-server-default", "test-game-server"}
E           AssertionError: assert 'test-na-west-1' in {'game-server-default', 'test-game-server'}

server/tests/test_lobby_api.py:119: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-22 05:01:05,951 - app - INFO - create_app:39 - Registered error handlers [0.00001s]
2026-06-22 05:01:05,951 - app - INFO - create_app:44 - Registered middleware [0.00006s]
2026-06-22 05:01:05,951 - app - INFO - create_app:49 - Initialized auth rate limiter [0.00001s]
2026-06-22 05:01:05,959 - app - INFO - create_app:58 - Registered routers [0.01s]
2026-06-22 05:01:05,959 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-22 05:01:06,052 - pymongo - INFO - _seed_mock_users:164 - Seeded default mock users for testing environment
2026-06-22 05:01:06,052 - pymongo - INFO - _seed_mock_game_servers:195 - Seeded default mock game servers for testing environment
2026-06-22 05:01:06,052 - app - INFO - create_app:63 - Initialized services [0.09368s]
2026-06-22 05:01:06,053 - app - INFO - create_app:66 - Total initialization time: [0.10136s]
2026-06-22 05:01:06,055 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:01:06,144 - app - INFO - register_user:155 - User registered: email=owner3@example.com
2026-06-22 05:01:06,145 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:01:06,226 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a38c192e0c9711e32b42f14
2026-06-22 05:01:06,226 - app - INFO - login_user:188 - User logged in: identifier=owner3@example.com
2026-06-22 05:01:06,228 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:01:06,309 - app - INFO - register_user:155 - User registered: email=joiner3@example.com
2026-06-22 05:01:06,310 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-22 05:01:06,393 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a38c192e0c9711e32b42f16
2026-06-22 05:01:06,393 - app - INFO - login_user:188 - User logged in: identifier=joiner3@example.com
------------------------------ Captured log call -------------------------------
INFO     app:app.py:39 Registered error handlers [0.00001s]
INFO     app:app.py:44 Registered middleware [0.00006s]
INFO     app:app.py:49 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:58 Registered routers [0.01s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:164 Seeded default mock users for testing environment
INFO     pymongo:mongo.py:195 Seeded default mock game servers for testing environment
INFO     app:app.py:63 Initialized services [0.09368s]
INFO     app:app.py:66 Total initialization time: [0.10136s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=owner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a38c192e0c9711e32b42f14
INFO     app:auth.py:188 User logged in: identifier=owner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=joiner3@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a38c192e0c9711e32b42f16
INFO     app:auth.py:188 User logged in: identifier=joiner3@example.com
=========================== short test summary info ============================
FAILED server/tests/test_lobby_api.py::test_join_returns_default_ws_urls_when_registry_is_empty - AssertionError: assert 'test-na-west-1' in {'game-server-default', 'test-game-server'}
1 failed, 55 passed in 15.44s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:4: test-backend] Error 1
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend` exited 2
STDOUT:
./server/scripts/test.sh

==================================== ERRORS ====================================
_______________ ERROR collecting server/tests/test_lobby_api.py ________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-ixgln0ns/repo/server/tests/test_lobby_api.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
server/tests/test_lobby_api.py:11: in <module>
    from server.utils.constants import LobbyDefaults
E   ImportError: cannot import name 'LobbyDefaults' from 'server.utils.constants' (/tmp/frontiercode-reverse-classical-ixgln0ns/repo/server/utils/constants.py)
=========================== short test summary info ============================
ERROR server/tests/test_lobby_api.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.16s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
make: *** [Makefile:4: test-backend] Error 2
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
...........................................................              [100%]
59 passed in 14.09s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/lobby.py, server/external/db/mongo.py, server/tests/conftest.py, server/tests/test_lobby_api.py, server/utils/constants.py
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
<summary>godhand__550c995fb17c__ubmFGLu: FAIL, score 0.875, criteria 19/20</summary>

- Task: `godhand__550c995fb17c`
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
hidden reference tests: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
........................................................                 [100%]
56 passed in 14.50s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `make test-backend` exited 2
STDOUT:
./server/scripts/test.sh

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
ImportError while loading conftest '/tmp/frontiercode-reverse-classical-ngf78720/repo/server/tests/conftest.py'.
server/tests/conftest.py:10: in <module>
    from server.api.websockets.lobby_chat import reset_all_lobby_chat_state_for_tests
E   ImportError: cannot import name 'reset_all_lobby_chat_state_for_tests' from 'server.api.websockets.lobby_chat' (/tmp/frontiercode-reverse-classical-ngf78720/repo/server/api/websockets/lobby_chat.py)
make: *** [Makefile:4: test-backend] Error 4
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
...........................................................              [100%]
59 passed in 19.46s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Too many changed files: 9 > 8
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

