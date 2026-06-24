# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | swarmsync__f34620a42d74__3ScHLYu | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | swarmsync__f34620a42d74__Ah5t9dc | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | swarmsync__f34620a42d74__jCvQsvn | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | swarmsync__f34620a42d74__rW6SJJo | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| swarmsync__f34620a42d74 | codex | openai/gpt-5.5 | high | swarmsync__f34620a42d74__yrxiXBt | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>swarmsync__f34620a42d74__3ScHLYu: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__f34620a42d74`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.039s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.014s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.014s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.018s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.006s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.207s
--- FAIL: TestHLC_TickWitness_NoHotPathAllocations (0.00s)
    clock_test.go:487: expected Tick hot path to allocate 0 times, got 2.00
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.027s
--- FAIL: TestORSet_RemoveConvergesAfterMerge (0.00s)
    crdt_test.go:545: observed remove should suppress old tag after merge
--- FAIL: TestORSet_ConcurrentAddWinsOverObservedRemove (0.00s)
    crdt_test.go:570: expected only the unseen add tag to remain, got 2 and 2
--- FAIL: TestORMap_DeleteConvergesAfterMerge (0.00s)
    crdt_test.go:693: observed delete should suppress old key tag after merge
--- FAIL: TestORMap_ConcurrentPutWinsOverObservedDelete (0.00s)
    crdt_test.go:717: a expected concurrent put to survive with new value, got (old, true)
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.026s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.026s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.040s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.005s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.090s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.019s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.020s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.018s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.021s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.026s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.014s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.010s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/swarmsync/main.go, pkg/bloom/bloom_test.go, pkg/bloom/filter.go, pkg/gossip/gossip_test.go, pkg/gossip/protocol.go, pkg/gossip/state.go, pkg/hash/hash_test.go, pkg/hash/ring.go, pkg/membership/member.go, pkg/membership/membership_test.go, pkg/membership/swim.go, pkg/merkle/errors.go, pkg/merkle/merkle_test.go, pkg/merkle/tree.go, pkg/queue/bounded.go, pkg/queue/deque.go, pkg/queue/priority.go, pkg/queue/queue_test.go, pkg/sim/network.go, pkg/sim/sim_test.go
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
<summary>swarmsync__f34620a42d74__Ah5t9dc: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__f34620a42d74`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.052s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.017s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.014s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.014s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.080s
--- FAIL: TestHLC_UpdatesStoredLastInPlace (0.00s)
    clock_test.go:485: Tick replaced stored last timestamp
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.035s
--- FAIL: TestORSet_RemoveConvergesAfterMerge (0.00s)
    crdt_test.go:520: removed tag resurrected on original replica
--- FAIL: TestORSet_ConcurrentAddRemove (0.00s)
    crdt_test.go:560: expected only concurrent tag to survive, got []crdt.ORTag{crdt.ORTag{NodeID:"n1", Counter:0x1}, crdt.ORTag{NodeID:"n1", Counter:0x2}}
--- FAIL: TestORMap_DeleteConvergesAfterMerge (0.00s)
    crdt_test.go:649: deleted key resurrected on original replica
--- FAIL: TestORMap_ConcurrentPutDeleteAddWins (0.00s)
    crdt_test.go:678: expected only concurrent key tag after convergence, got []crdt.ORTag{crdt.ORTag{NodeID:"n1", Counter:0x2}, crdt.ORTag{NodeID:"n1", Counter:0x1}}
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.008s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.016s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.016s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.020s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.006s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.059s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.015s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.027s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.016s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.007s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/swarmsync/main.go, pkg/bloom/bloom_test.go, pkg/bloom/filter.go, pkg/gossip/gossip_test.go, pkg/gossip/protocol.go, pkg/gossip/state.go, pkg/hash/hash_test.go, pkg/hash/ring.go, pkg/membership/member.go, pkg/membership/membership_test.go, pkg/membership/swim.go, pkg/merkle/errors.go, pkg/merkle/merkle_test.go, pkg/merkle/tree.go, pkg/queue/bounded.go, pkg/queue/deque.go, pkg/queue/priority.go, pkg/queue/queue_test.go, pkg/sim/network.go, pkg/sim/sim_test.go
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
<summary>swarmsync__f34620a42d74__jCvQsvn: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__f34620a42d74`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.029s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.017s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.015s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.004s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.038s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.007s
--- FAIL: TestORSet_RemoveConvergesAfterMerge (0.00s)
    crdt_test.go:553: observed remove should delete element after merge
--- FAIL: TestORSet_ConcurrentAddWinsAfterObservedRemove (0.00s)
    crdt_test.go:578: expected only the concurrent add tag to remain, got 2
--- FAIL: TestORMap_DeleteConvergesAfterMerge (0.00s)
    crdt_test.go:709: observed delete should remove key after merge
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.020s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.020s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.014s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.048s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.013s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.006s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.007s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.018s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.005s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/swarmsync/main.go, pkg/bloom/bloom_test.go, pkg/bloom/filter.go, pkg/gossip/gossip_test.go, pkg/gossip/protocol.go, pkg/gossip/state.go, pkg/hash/hash_test.go, pkg/hash/ring.go, pkg/membership/member.go, pkg/membership/membership_test.go, pkg/membership/swim.go, pkg/merkle/errors.go, pkg/merkle/merkle_test.go, pkg/merkle/tree.go, pkg/queue/bounded.go, pkg/queue/deque.go, pkg/queue/priority.go, pkg/queue/queue_test.go, pkg/sim/network.go, pkg/sim/sim_test.go
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
<summary>swarmsync__f34620a42d74__rW6SJJo: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__f34620a42d74`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.029s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.029s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.003s
--- FAIL: TestORSet_RemoveConvergesAfterMerge (0.00s)
    crdt_test.go:546: observed remove should converge across replicas
--- FAIL: TestORSet_ConcurrentAddObservedRemoveAddWins (0.00s)
    crdt_test.go:569: expected exactly one surviving tag, got 2 and 2
--- FAIL: TestORMap_DeleteConvergesAfterMerge (0.00s)
    crdt_test.go:649: expected delete to converge on first replica
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.009s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.027s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.002s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.003s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/swarmsync/main.go, pkg/bloom/bloom_test.go, pkg/bloom/filter.go, pkg/gossip/gossip_test.go, pkg/gossip/protocol.go, pkg/gossip/state.go, pkg/hash/hash_test.go, pkg/hash/ring.go, pkg/membership/member.go, pkg/membership/membership_test.go, pkg/membership/swim.go, pkg/merkle/errors.go, pkg/merkle/merkle_test.go, pkg/merkle/tree.go, pkg/queue/bounded.go, pkg/queue/deque.go, pkg/queue/priority.go, pkg/queue/queue_test.go, pkg/sim/network.go, pkg/sim/sim_test.go
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
<summary>swarmsync__f34620a42d74__yrxiXBt: FAIL, score 0.000, criteria 19/20</summary>

- Task: `swarmsync__f34620a42d74`
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
hidden reference tests: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.036s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.005s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.003s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./...` exited 1
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.030s
--- FAIL: TestHLC_UpdatesLastInPlaceAndKeepsReturnedSnapshotsStable (0.00s)
    clock_test.go:477: Tick should update stored last timestamp in place
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.003s
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt [build failed]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.011s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.002s
FAIL

STDERR:
# github.com/Mustafa4ngin/SwarmSync/pkg/crdt [github.com/Mustafa4ngin/SwarmSync/pkg/crdt.test]
pkg/crdt/crdt_test.go:95:7: a.total undefined (type *GCounter has no field or method total)
pkg/crdt/crdt_test.go:96:47: a.total undefined (type *GCounter has no field or method total)
pkg/crdt/crdt_test.go:103:7: a.total undefined (type *GCounter has no field or method total)
pkg/crdt/crdt_test.go:104:69: a.total undefined (type *GCounter has no field or method total)
pkg/crdt/crdt_test.go:230:7: a.posTotal undefined (type *PNCounter has no field or method posTotal)
pkg/crdt/crdt_test.go:230:27: a.negTotal undefined (type *PNCounter has no field or method negTotal)
pkg/crdt/crdt_test.go:231:55: a.posTotal undefined (type *PNCounter has no field or method posTotal)
pkg/crdt/crdt_test.go:231:67: a.negTotal undefined (type *PNCounter has no field or method negTotal)
pkg/crdt/crdt_test.go:238:7: a.posTotal undefined (type *PNCounter has no field or method posTotal)
pkg/crdt/crdt_test.go:238:27: a.negTotal undefined (type *PNCounter has no field or method negTotal)
pkg/crdt/crdt_test.go:238:27: too many errors
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./...` exited 0
STDOUT:
?   	github.com/Mustafa4ngin/SwarmSync/cmd/swarmsync	[no test files]
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/bloom	0.031s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/clock	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/gossip	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/hash	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/membership	0.012s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/merkle	0.003s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/queue	0.004s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/sim	0.010s
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/transport	0.005s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/swarmsync/main.go, pkg/bloom/bloom_test.go, pkg/bloom/filter.go, pkg/gossip/gossip_test.go, pkg/gossip/protocol.go, pkg/gossip/state.go, pkg/hash/hash_test.go, pkg/hash/ring.go, pkg/membership/member.go, pkg/membership/membership_test.go, pkg/membership/swim.go, pkg/merkle/errors.go, pkg/merkle/merkle_test.go, pkg/merkle/tree.go, pkg/queue/bounded.go, pkg/queue/deque.go, pkg/queue/priority.go, pkg/queue/queue_test.go, pkg/sim/network.go, pkg/sim/sim_test.go
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

