# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | 5 | 0.400 | 0.400 | 0.400 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | 5 | 0.400 | 0.400 | 0.400 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__PbSn9LQ | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__mZQ6ZFb | no | 19/20 | patch_specific 5/6, regular 14/14 | 0.000 | hidden_reference_tests_pass |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__mqfe5iD | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__o7n6VhQ | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| godhand__550c995fb17c | codex | openai/gpt-5.5 | high | godhand__550c995fb17c__wBtV23K | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>godhand__550c995fb17c__PbSn9LQ: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__550c995fb17c`
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
hidden reference tests: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
........................................................                 [100%]
56 passed in 8.88s

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

==================================== ERRORS ====================================
_______________ ERROR collecting server/tests/test_lobby_api.py ________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-7kh7_7sv/repo/server/tests/test_lobby_api.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
server/tests/test_lobby_api.py:6: in <module>
    from server.utils.constants import LobbyDefaults
E   ImportError: cannot import name 'LobbyDefaults' from 'server.utils.constants' (/tmp/frontiercode-reverse-classical-7kh7_7sv/repo/server/utils/constants.py)
=========================== short test summary info ============================
ERROR server/tests/test_lobby_api.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.13s

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
..........................................................               [100%]
58 passed in 9.03s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/lobby.py, server/api/websockets/connection_hub.py, server/api/websockets/lobby_game.py, server/application/messaging/chat_service.py, server/external/db/models/lobby.py, server/tests/conftest.py, server/tests/test_lobby_api.py, server/utils/constants.py
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
<summary>godhand__550c995fb17c__mZQ6ZFb: FAIL, score 0.000, criteria 19/20</summary>

- Task: `godhand__550c995fb17c`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
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
................................FFF.FFFF.F..........F.FF                 [100%]
=================================== FAILURES ===================================
___________________________ test_join_and_leave_flow ___________________________

    def test_join_and_leave_flow():
        """
        Verifies:
          - POST /api/v1/lobbies/{lobby_id}/join adds the user to players
          - POST /api/v1/lobbies/{lobby_id}/leave removes the user
          - join returns 200 with {"lobby": ...}
        """
        app = create_app()
        with TestClient(app) as client:
            owner = create_and_login(client, "owner2@example.com")
            lobby = create_lobby(client, "join-leave-lobby", user_capacity=4)
            lobby_id = lobby["_id"]
    
            # second user registers and logs in
            bob = create_and_login(client, "bob@example.com")
    
            # bob joins
            csrf = get_auth_csrf(client)
            r = client.post(f"/api/v1/lobbies/{lobby_id}/join", headers={"X-CSRF-TOKEN": csrf})
>           assert r.status_code == 200, r.text
E           AssertionError: {"detail":"No healthy game server is available for this lobby.","path":"/api/v1/lobbies/6a3459fb5d5d4ddc8824eb9c/join","method":"POST","url":"http://testserver/api/v1/lobbies/6a3459fb5d5d4ddc8824eb9c/join"}
E           assert 503 == 200
E            +  where 503 = <Response [503 Service Unavailable]>.status_code

server/tests/test_lobby_api.py:83: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 20:50:02,869 - app - INFO - create_app:39 - Registered error handlers [0.00001s]
2026-06-18 20:50:02,870 - app - INFO - create_app:44 - Registered middleware [0.00004s]
2026-06-18 20:50:02,870 - app - INFO - create_app:49 - Initialized auth rate limiter [0.00001s]
2026-06-18 20:50:02,873 - app - INFO - create_app:58 - Registered routers [0.00s]
2026-06-18 20:50:02,873 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 20:50:02,933 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 20:50:02,933 - app - INFO - create_app:63 - Initialized services [0.05963s]
2026-06-18 20:50:02,933 - app - INFO - create_app:66 - Total initialization time: [0.06366s]
2026-06-18 20:50:02,934 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 20:50:02,994 - app - INFO - register_user:155 - User registered: email=owner2@example.com
2026-06-18 20:50:02,995 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 20:50:03,056 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a3459fa5d5d4ddc8824eb9b
2026-06-18 20:50:03,056 - app - INFO - login_user:188 - User logged in: identifier=owner2@example.com
2026-06-18 20:50:03,057 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 20:50:03,120 - app - INFO - register_user:155 - User registered: email=bob@example.com
2026-06-18 20:50:03,121 - app - INFO - issue_anon_csrf_token:24 - Issued anonymous CSRF token
2026-06-18 20:50:03,180 - app - INFO - create_and_set_tokens:124 - Issued JWT cookies for user_id=6a3459fb5d5d4ddc8824eb9d
2026-06-18 20:50:03,180 - app - INFO - login_user:188 - User logged in: identifier=bob@example.com
------------------------------ Captured log call -------------------------------
INFO     app:app.py:39 Registered error handlers [0.00001s]
INFO     app:app.py:44 Registered middleware [0.00004s]
INFO     app:app.py:49 Initialized auth rate limiter [0.00001s]
INFO     app:app.py:58 Registered routers [0.00s]
INFO     pymongo:mongo.py:39 Initialized mongomock MongoDB client for testing
INFO     pymongo:mongo.py:163 Seeded default mock users for testing environment
INFO     app:app.py:63 Initialized services [0.05963s]
INFO     app:app.py:66 Total initialization time: [0.06366s]
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=owner2@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a3459fa5d5d4ddc8824eb9b
INFO     app:auth.py:188 User logged in: identifier=owner2@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:auth.py:155 User registered: email=bob@example.com
INFO     app:csrf.py:24 Issued anonymous CSRF token
INFO     app:jwt.py:124 Issued JWT cookies for user_id=6a3459fb5d5d4ddc8824eb9d
INFO     app:auth.py:188 User logged in: identifier=bob@example.com
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
>           assert response.status_code == 200, response.text
E           AssertionError: {"detail":"No healthy game server is available for this lobby.","path":"/api/v1/lobbies/6a3459fb5d5d4ddc8824eba0/join","method":"POST","url":"http://testserver/api/v1/lobbies/6a3459fb5d5d4ddc8824eba0/join"}
E           assert 503 == 200
E            +  where 503 = <Response [503 Service Unavailable]>.status_code

server/tests/test_lobby_api.py:114: AssertionError
----------------------------- Captured stdout call -----------------------------
2026-06-18 20:50:03,197 - app - INFO - create_app:39 - Registered error handlers [0.00001s]
2026-06-18 20:50:03,197 - app - INFO - create_app:44 - Registered middleware [0.00004s]
2026-06-18 20:50:03,197 - app - INFO - create_app:49 - Initialized auth rate limiter
...<truncated>...
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
ImportError while loading conftest '/tmp/frontiercode-reverse-classical-y467ug4k/repo/server/tests/conftest.py'.
server/tests/conftest.py:13: in <module>
    from server.utils.constants import LobbyDefaults
E   ImportError: cannot import name 'LobbyDefaults' from 'server.utils.constants' (/tmp/frontiercode-reverse-classical-y467ug4k/repo/server/utils/constants.py)
make: *** [Makefile:4: test-backend] Error 4
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
............................................................             [100%]
60 passed in 10.78s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/lobby.py, server/api/websockets/connection_hub.py, server/api/websockets/lobby_chat.py, server/api/websockets/lobby_game.py, server/application/messaging/chat_service.py, server/tests/conftest.py, server/tests/test_lobby_api.py, server/utils/constants.py
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
<summary>godhand__550c995fb17c__mqfe5iD: FAIL, score 0.000, criteria 19/20</summary>

- Task: `godhand__550c995fb17c`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
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
56 passed in 12.67s

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

==================================== ERRORS ====================================
_______________ ERROR collecting server/tests/test_lobby_api.py ________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-8tqrftkx/repo/server/tests/test_lobby_api.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
server/tests/test_lobby_api.py:5: in <module>
    from server.utils.constants import LobbyDefaults
E   ImportError: cannot import name 'LobbyDefaults' from 'server.utils.constants' (/tmp/frontiercode-reverse-classical-8tqrftkx/repo/server/utils/constants.py)
=========================== short test summary info ============================
ERROR server/tests/test_lobby_api.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.11s

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
59 passed in 12.42s

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
<summary>godhand__550c995fb17c__o7n6VhQ: FAIL, score 0.000, criteria 19/20</summary>

- Task: `godhand__550c995fb17c`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
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
56 passed in 13.08s

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
2026-06-18 20:49:44,060 - app - INFO - create_app:39 - Registered error handlers [0.00001s]
2026-06-18 20:49:44,060 - app - INFO - create_app:44 - Registered middleware [0.00006s]
2026-06-18 20:49:44,060 - app - INFO - create_app:49 - Initialized auth rate limiter [0.00001s]
2026-06-18 20:49:44,065 - app - INFO - create_app:58 - Registered routers [0.00s]
2026-06-18 20:49:44,065 - pymongo - INFO - initialize:39 - Initialized mongomock MongoDB client for testing
2026-06-18 20:49:44,121 - pymongo - INFO - _seed_mock_users:163 - Seeded default mock users for testing environment
2026-06-18 20:49:44,121 - app - INFO - create_app:63 - Initialized services [0.05655s]
2026-06-18 20:49:44,121 - app - INFO - create_app:66 - Total initialization time: [0.06120s]

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
ImportError while loading conftest '/tmp/frontiercode-reverse-classical-ejpglb0v/repo/server/tests/conftest.py'.
server/tests/conftest.py:19: in <module>
    from server.api.websockets.lobby_chat import reset_lobby_chat_test_state
E   ImportError: cannot import name 'reset_lobby_chat_test_state' from 'server.api.websockets.lobby_chat' (/tmp/frontiercode-reverse-classical-ejpglb0v/repo/server/api/websockets/lobby_chat.py)
make: *** [Makefile:4: test-backend] Error 4
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
............................................................             [100%]
60 passed in 14.11s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Too many changed files: 10 > 8
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
<summary>godhand__550c995fb17c__wBtV23K: PASS, score 1.000, criteria 20/20</summary>

- Task: `godhand__550c995fb17c`
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
hidden reference tests: `make test-backend` exited 0
STDOUT:
./server/scripts/test.sh
........................................................                 [100%]
56 passed in 10.01s

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

==================================== ERRORS ====================================
_______________ ERROR collecting server/tests/test_lobby_api.py ________________
ImportError while importing test module '/tmp/frontiercode-reverse-classical-i0pwqlbo/repo/server/tests/test_lobby_api.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/usr/local/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
server/tests/test_lobby_api.py:11: in <module>
    from server.utils.constants import LobbyDefaults
E   ImportError: cannot import name 'LobbyDefaults' from 'server.utils.constants' (/tmp/frontiercode-reverse-classical-i0pwqlbo/repo/server/utils/constants.py)
=========================== short test summary info ============================
ERROR server/tests/test_lobby_api.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.11s

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
59 passed in 10.01s

STDERR:
/usr/local/lib/python3.12/site-packages/requests/__init__.py:113: RequestsDependencyWarning: urllib3 (2.21.902) or chardet (7.4.3)/charset_normalizer (3.4.7) doesn't match a supported version!
  warnings.warn(
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: server/api/routers/lobby.py, server/api/websockets/connection_hub.py, server/api/websockets/lobby_chat.py, server/api/websockets/lobby_game.py, server/application/messaging/chat_service.py, server/tests/conftest.py, server/tests/test_lobby_api.py, server/utils/constants.py
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

