# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 2
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| nexusflow__77dc75b | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| nexusflow__77dc75b | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| nexusflow__77dc75b | codex | openai/gpt-5.5 | high | nexusflow__77dc75b__aMqiRvn | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| nexusflow__77dc75b | codex | openai/gpt-5.5 | high | nexusflow__77dc75b__nAJC6HC | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>nexusflow__77dc75b__aMqiRvn: FAIL, score 0.000, criteria 19/20</summary>

- Task: `nexusflow__77dc75b`
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
hidden reference tests: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 0
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
........................................................................ [ 75%]
........................................................................ [100%]
288 passed in 1.16s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 1
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
.............................F
=================================== FAILURES ===================================
____________ TestRetryPolicy.test_retry_only_on_specified_subclass _____________

self = <test_tasks.test_worker.TestRetryPolicy object at 0xffff9c35ae40>

    def test_retry_only_on_specified_subclass(self):
        class CustomConnectionError(ConnectionError):
            pass
    
        policy = RetryPolicy(max_retries=3, retry_on={ConnectionError})
>       assert policy.should_retry(CustomConnectionError(), attempt=0) is True
E       AssertionError: assert False is True
E        +  where False = should_retry(CustomConnectionError(), attempt=0)
E        +    where should_retry = <nexusflow.tasks.worker.RetryPolicy object at 0xffff9c09eed0>.should_retry
E        +    and   CustomConnectionError() = <class 'test_tasks.test_worker.TestRetryPolicy.test_retry_only_on_specified_subclass.<locals>.CustomConnectionError'>()

tests/test_tasks/test_worker.py:51: AssertionError
=========================== short test summary info ============================
FAILED tests/test_tasks/test_worker.py::TestRetryPolicy::test_retry_only_on_specified_subclass - AssertionError: assert False is True
 +  where False = should_retry(CustomConnectionError(), attempt=0)
 +    where should_retry = <nexusflow.tasks.worker.RetryPolicy object at 0xffff9c09eed0>.should_retry
 +    and   CustomConnectionError() = <class 'test_tasks.test_worker.TestRetryPolicy.test_retry_only_on_specified_subclass.<locals>.CustomConnectionError'>()
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
1 failed, 173 passed in 0.22s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 0
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
........................................................................ [ 75%]
.....................................................................    [100%]
285 passed in 1.15s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Too many changed files: 7 > 6
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
<summary>nexusflow__77dc75b__nAJC6HC: FAIL, score 0.000, criteria 19/20</summary>

- Task: `nexusflow__77dc75b`
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
hidden reference tests: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 0
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
........................................................................ [ 75%]
........................................................................ [100%]
288 passed in 1.08s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 1
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
............................F
=================================== FAILURES ===================================
_________ TestRetryPolicy.test_should_retry_subclass_of_specified_type _________

self = <test_tasks.test_worker.TestRetryPolicy object at 0xffff8ddb3350>

    def test_should_retry_subclass_of_specified_type(self):
        class TransientConnectionError(ConnectionError):
            pass
    
        policy = RetryPolicy(max_retries=3, retry_on={ConnectionError})
>       assert policy.should_retry(TransientConnectionError(), attempt=0) is True
E       AssertionError: assert False is True
E        +  where False = should_retry(TransientConnectionError(), attempt=0)
E        +    where should_retry = <nexusflow.tasks.worker.RetryPolicy object at 0xffff8dab2e10>.should_retry
E        +    and   TransientConnectionError() = <class 'test_tasks.test_worker.TestRetryPolicy.test_should_retry_subclass_of_specified_type.<locals>.TransientConnectionError'>()

tests/test_tasks/test_worker.py:40: AssertionError
=========================== short test summary info ============================
FAILED tests/test_tasks/test_worker.py::TestRetryPolicy::test_should_retry_subclass_of_specified_type - AssertionError: assert False is True
 +  where False = should_retry(TransientConnectionError(), attempt=0)
 +    where should_retry = <nexusflow.tasks.worker.RetryPolicy object at 0xffff8dab2e10>.should_retry
 +    and   TransientConnectionError() = <class 'test_tasks.test_worker.TestRetryPolicy.test_should_retry_subclass_of_specified_type.<locals>.TransientConnectionError'>()
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
1 failed, 172 passed in 0.21s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `python -m pytest tests/ -x -q --ignore=tests/test_auth --ignore=tests/test_db --ignore=tests/test_plugins --ignore=tests/test_tasks/test_scheduler.py` exited 0
STDOUT:
........................................................................ [ 25%]
........................................................................ [ 50%]
........................................................................ [ 75%]
.....................................................................    [100%]
285 passed in 1.11s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Too many changed files: 7 > 6
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

