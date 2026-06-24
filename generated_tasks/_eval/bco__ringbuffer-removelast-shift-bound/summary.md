# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | bco__ringbuffer-removelast-shift__4hQAXMA | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | submitted_tests_fail_on_base |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | bco__ringbuffer-removelast-shift__5ngsgW3 | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | submitted_tests_fail_on_base |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | bco__ringbuffer-removelast-shift__68Pcmjn | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | submitted_tests_fail_on_base |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | bco__ringbuffer-removelast-shift__8hhqUdM | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base |
| bco__ringbuffer-removelast-shift-bound | codex | openai/gpt-5.5 | high | bco__ringbuffer-removelast-shift__jVxyNU8 | no | 18/20 | patch_specific 6/6, regular 12/14 | 0.000 | submitted_tests_fail_on_base, visible_regression_tests_pass |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>bco__ringbuffer-removelast-shift__4hQAXMA: FAIL, score 0.000, criteria 19/20</summary>

- Task: `bco__ringbuffer-removelast-shift-bound`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `submitted_tests_fail_on_base`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
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
hidden reference tests: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	24.434s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	16.348s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	21.635s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/ringbuffer.go, bco-core/ringbuffer_test.go
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
<summary>bco__ringbuffer-removelast-shift__5ngsgW3: FAIL, score 0.000, criteria 19/20</summary>

- Task: `bco__ringbuffer-removelast-shift-bound`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `submitted_tests_fail_on_base`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
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
hidden reference tests: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	13.869s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	16.009s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	13.660s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/ringbuffer.go, bco-core/ringbuffer_test.go
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
<summary>bco__ringbuffer-removelast-shift__68Pcmjn: FAIL, score 0.000, criteria 19/20</summary>

- Task: `bco__ringbuffer-removelast-shift-bound`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 19/20
- Categories: patch_specific 6/6, regular 13/14
- Blocker failures: `submitted_tests_fail_on_base`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
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
hidden reference tests: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	13.684s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	18.521s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	16.124s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/ringbuffer.go, bco-core/ringbuffer_test.go
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
<summary>bco__ringbuffer-removelast-shift__8hhqUdM: FAIL, score 0.000, criteria 18/20</summary>

- Task: `bco__ringbuffer-removelast-shift-bound`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `submitted_tests_fail_on_base`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 0.000 | no |
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
hidden reference tests: `cd bco-core && go test ./...` exited 1
STDOUT:
[2026-06-22T23:10:45.953Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:10:45.953Z] [INFO] [CAPI] engine 2 started peer=12D3KooWExEes8uJi3mKwh7hMSQk4JqbNCkagjoN8jsvRsYC5nfW
[2026-06-22T23:10:45.979Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:10:45.979Z] [INFO] [CAPI] engine 3 started peer=12D3KooWRGgZdQP776eYgSurZJMmKRSAwedyZ4xrWiLcLga9xvEo
[2026-06-22T23:10:45.979Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=0 (Idle) has_bluetooth=false (reported=false bt_applied=true priority param=0, priority_applied=true, -1 means keep existing)
[2026-06-22T23:10:45.979Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-22T23:10:45.979Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:10:45.979Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWRGgZ…) local: audio_priority=0 (Idle) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=0
[2026-06-22T23:10:45.979Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-22T23:10:45.979Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=100 (Media) has_bluetooth=false (reported=false bt_applied=true priority param=100, priority_applied=true, -1 means keep existing)
[2026-06-22T23:10:45.979Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=2 to 0 peers
[2026-06-22T23:10:45.979Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:10:45.979Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWRGgZ…) local: audio_priority=100 (Media) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=100
[2026-06-22T23:10:45.979Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWRGgZ…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:10:45.980Z] [INFO] [Priority] CONNECT_BT event: local "capi-prio-enum" won resolution (audio_priority=100 tier=Media effective_score=100) and reports no headset link — platform should connect saved device
[2026-06-22T23:10:45.980Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=200 (IncomingCall) has_bluetooth=false (reported=false bt_applied=true priority param=200, priority_applied=true, -1 means keep existing)
[2026-06-22T23:10:45.980Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=4 to 0 peers
[2026-06-22T23:10:45.980Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:10:45.980Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWRGgZ…) local: audio_priority=200 (IncomingCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=200
[2026-06-22T23:10:45.980Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWRGgZ…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:10:45.980Z] [INFO] [Engine] suppressed Bluetooth shell event CONNECT_BT (peer "capi-prio-enum"): cooldown remaining 1.998s
[2026-06-22T23:10:45.980Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=300 (ActiveCall) has_bluetooth=false (reported=false bt_applied=true priority param=300, priority_applied=true, -1 means keep existing)
[2026-06-22T23:10:45.980Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=5 to 0 peers
[2026-06-22T23:10:45.980Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:10:45.980Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWRGgZ…) local: audio_priority=300 (ActiveCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=300
[2026-06-22T23:10:45.981Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWRGgZ…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:10:45.993Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:10:45.993Z] [INFO] [CAPI] engine 4 started peer=12D3KooWGtvtUrZSWH8TYNkaSKUfFNWTT4fjGYjg5izCnH9Emj6A
[2026-06-22T23:10:45.993Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-custom" audio_priority=42 (Tier(42)) has_bluetooth=false (reported=false bt_applied=true priority param=42, priority_applied=true, -1 means keep existing)
[2026-06-22T23:10:45.993Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-22T23:10:45.993Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:10:45.993Z] [INFO] [Priority]   candidate "capi-prio-custom" (12D3KooWGtvt…) local: audio_priority=42 (Tier(42)) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=42
[2026-06-22T23:10:45.993Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-22T23:10:46.007Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:1
...<truncated>...
STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	13.674s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	16.605s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/ringbuffer.go, bco-core/ringbuffer_test.go
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
<summary>bco__ringbuffer-removelast-shift__jVxyNU8: FAIL, score 0.000, criteria 18/20</summary>

- Task: `bco__ringbuffer-removelast-shift-bound`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 6/6, regular 12/14
- Blocker failures: `submitted_tests_fail_on_base`, `visible_regression_tests_pass`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	15.926s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 0
STDOUT:
ok  	github.com/hvaghani221/bco/bco-core	14.642s
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]

STDERR:
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 1
STDOUT:
[2026-06-22T23:12:29.741Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:12:29.741Z] [INFO] [CAPI] engine 2 started peer=12D3KooWQodV3VA7ZH9ayiqo3CAy43ENeXge1pfxYJyzpb1qeLNc
[2026-06-22T23:12:29.826Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:12:29.826Z] [INFO] [CAPI] engine 3 started peer=12D3KooWBUgxZRXU8gFYamrQ4897PG3Drjqsy6nfuYQ5N2G9Qx7d
[2026-06-22T23:12:29.826Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=0 (Idle) has_bluetooth=false (reported=false bt_applied=true priority param=0, priority_applied=true, -1 means keep existing)
[2026-06-22T23:12:29.826Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-22T23:12:29.826Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWBUgx…) local: audio_priority=0 (Idle) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=0
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-22T23:12:29.826Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=100 (Media) has_bluetooth=false (reported=false bt_applied=true priority param=100, priority_applied=true, -1 means keep existing)
[2026-06-22T23:12:29.826Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=2 to 0 peers
[2026-06-22T23:12:29.826Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWBUgx…) local: audio_priority=100 (Media) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=100
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWBUgx…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:12:29.826Z] [INFO] [Priority] CONNECT_BT event: local "capi-prio-enum" won resolution (audio_priority=100 tier=Media effective_score=100) and reports no headset link — platform should connect saved device
[2026-06-22T23:12:29.826Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=200 (IncomingCall) has_bluetooth=false (reported=false bt_applied=true priority param=200, priority_applied=true, -1 means keep existing)
[2026-06-22T23:12:29.826Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=4 to 0 peers
[2026-06-22T23:12:29.826Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWBUgx…) local: audio_priority=200 (IncomingCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=200
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWBUgx…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:12:29.826Z] [INFO] [Engine] suppressed Bluetooth shell event CONNECT_BT (peer "capi-prio-enum"): cooldown remaining 1.999s
[2026-06-22T23:12:29.826Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=300 (ActiveCall) has_bluetooth=false (reported=false bt_applied=true priority param=300, priority_applied=true, -1 means keep existing)
[2026-06-22T23:12:29.826Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=5 to 0 peers
[2026-06-22T23:12:29.826Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWBUgx…) local: audio_priority=300 (ActiveCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=300
[2026-06-22T23:12:29.826Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWBUgx…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-22T23:12:29.857Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:12:29.857Z] [INFO] [CAPI] engine 4 started peer=12D3KooWD5D4xKHHqkR4nTb6zZXZp93qkWhQH1JZByuJYzBpzjgW
[2026-06-22T23:12:29.857Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-custom" audio_priority=42 (Tier(42)) has_bluetooth=false (reported=false bt_applied=true priority param=42, priority_applied=true, -1 means keep existing)
[2026-06-22T23:12:29.857Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-22T23:12:29.857Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-22T23:12:29.857Z] [INFO] [Priority]   candidate "capi-prio-custom" (12D3KooWD5D4…) local: audio_priority=42 (Tier(42)) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=42
[2026-06-22T23:12:29.857Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-22T23:12:29.904Z] [INFO] [Network] mDNS discovery started
[2026-06-22T23:1
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/ratelimit_test.go, bco-core/ringbuffer.go, bco-core/ringbuffer_test.go
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

