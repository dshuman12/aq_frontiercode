# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | 5 | 0.400 | 0.400 | 0.400 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | 5 | 0.400 | 0.400 | 0.400 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | swarmsync__ratelimit-refill-tole__AGaQbeM | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | swarmsync__ratelimit-refill-tole__BzwPpY5 | no | 18/20 | patch_specific 6/6, regular 12/14 | 0.000 | submitted_tests_fail_on_base, visible_regression_tests_pass |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | swarmsync__ratelimit-refill-tole__hDDDPGD | no | 19/20 | patch_specific 5/6, regular 14/14 | 0.000 | hidden_reference_tests_pass |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | swarmsync__ratelimit-refill-tole__mcTmAE8 | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__ratelimit-refill-tolerance | codex | openai/gpt-5.5 | high | swarmsync__ratelimit-refill-tole__rmUwQ34 | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>swarmsync__ratelimit-refill-tole__AGaQbeM: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__ratelimit-refill-tolerance`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.090s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.194s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.088s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.089s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.089s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.085s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.085s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.085s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.090s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.166s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.155s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.190s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.404s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.104s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.192s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.192s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.099s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.198s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.199s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.197s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.092s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.161s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.104s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.406s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.406s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.198s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.199s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.107s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.197s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.288s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.105s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.089s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.167s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/ratelimit/bucket_test.go
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
<summary>swarmsync__ratelimit-refill-tole__BzwPpY5: FAIL, score 0.000, criteria 18/20</summary>

- Task: `swarmsync__ratelimit-refill-tolerance`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.395s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.492s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.195s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.107s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.190s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.185s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.290s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.198s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.195s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.208s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.099s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.106s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.082s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.081s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.187s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.201s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.500s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.295s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.181s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.091s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.089s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.203s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.208s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.203s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.300s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.112s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.201s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.196s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.090s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.082s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.169s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.496s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.302s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.003s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.195s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.284s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.310s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.307s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.111s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.110s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.091s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.179s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s
FAIL

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/ratelimit/bucket_test.go
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
<summary>swarmsync__ratelimit-refill-tole__hDDDPGD: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__ratelimit-refill-tolerance`
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
hidden reference tests: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.099s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.596s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.194s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.097s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.196s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.195s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.197s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.105s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.099s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.074s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.165s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s
FAIL

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.298s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.300s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.100s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.190s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.189s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.288s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.196s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.193s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.091s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.088s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.161s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.106s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.303s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.191s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.193s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.192s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.091s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.191s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.164s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/ratelimit/bucket_test.go
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
<summary>swarmsync__ratelimit-refill-tole__mcTmAE8: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__ratelimit-refill-tolerance`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.296s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.196s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.091s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.104s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.212s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.106s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.209s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.157s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.305s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.109s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.093s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.190s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.191s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.199s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.293s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.160s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.399s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.195s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.188s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.105s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.191s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.093s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.159s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/ratelimit/bucket_test.go
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
<summary>swarmsync__ratelimit-refill-tole__rmUwQ34: FAIL, score 0.000, criteria 18/20</summary>

- Task: `swarmsync__ratelimit-refill-tolerance`
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
hidden reference tests: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.294s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.409s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.104s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.110s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.096s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.095s
--- FAIL: TestStats_Uptime (0.00s)
    gossip_test.go:484: uptime should be positive
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.101s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.102s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.097s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.090s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.094s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.179s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s
FAIL

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.397s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.412s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.095s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.098s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.200s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.100s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.202s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.179s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bitmap	0.103s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.306s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/circuit	0.189s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.188s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/consistent	0.109s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/dag	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/election	0.204s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.111s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/idgen	0.105s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/lru	0.106s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.304s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.197s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/metrics	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ratelimit	0.210s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/rendezvous	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/retry	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/shard	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/skiplist	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.001s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/ttlmap	0.183s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/wal	0.001s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/ratelimit/bucket_test.go
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

