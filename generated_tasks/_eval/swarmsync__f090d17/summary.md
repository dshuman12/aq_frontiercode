# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | swarmsync__f090d17__5DZiLCh | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | swarmsync__f090d17__TRKcs4Q | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | swarmsync__f090d17__XQnKtTM | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | swarmsync__f090d17__eYLFo9w | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| swarmsync__f090d17 | codex | openai/gpt-5.5 | high | swarmsync__f090d17__tbab5SY | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>swarmsync__f090d17__5DZiLCh: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__f090d17`
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
hidden reference tests: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/crdt/...` exited 1
STDOUT:
--- FAIL: TestORSet_MergeTags (0.00s)
    crdt_test.go:521: expected 2 tags after merge, got 1
--- FAIL: TestORSet_MergePreservesLocalAdditions (0.00s)
    crdt_test.go:539: expected shared element to have 2 tags, got 1
--- FAIL: TestORSet_BidirectionalMergeStateExchange (0.00s)
    crdt_test.go:560: expected shared element to have 2 tags after convergence, got 1
--- FAIL: TestORSet_MergeIdempotent (0.00s)
    crdt_test.go:597: expected idempotent merge to keep 2 unique tags, got 1
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/crdt/counter.go, pkg/crdt/crdt_test.go, pkg/crdt/ormap.go, pkg/crdt/register.go, pkg/crdt/rga.go, pkg/crdt/set.go
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
<summary>swarmsync__f090d17__TRKcs4Q: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__f090d17`
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
hidden reference tests: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/crdt/...` exited 1
STDOUT:
--- FAIL: TestORSet_MergeTags (0.00s)
    crdt_test.go:516: expected 2 tags after merge, got 1
--- FAIL: TestORSet_MergeConcurrentAddsBidirectional (0.00s)
    crdt_test.go:534: a should have union of concurrent add tags, got 1
--- FAIL: TestORSet_MergeIdempotent (0.00s)
    crdt_test.go:573: expected 2 tags for x after repeated merge, got 1
--- FAIL: TestORSet_AddWinsAcrossReplicaMerges (0.00s)
    crdt_test.go:598: a should retain only the unseen concurrent add tag, got 2
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/crdt/counter.go, pkg/crdt/crdt_test.go, pkg/crdt/ormap.go, pkg/crdt/register.go, pkg/crdt/rga.go, pkg/crdt/set.go
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
<summary>swarmsync__f090d17__XQnKtTM: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__f090d17`
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
hidden reference tests: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/crdt/...` exited 1
STDOUT:
--- FAIL: TestORSet_MergePreservesLocalAdditionsAndUnionsTags (0.00s)
    crdt_test.go:515: expected x to have 2 tags after merge, got 1
--- FAIL: TestORSet_BidirectionalMergeStateExchange (0.00s)
    crdt_test.go:549: expected shared to have 2 tags after bidirectional merge, got 1
--- FAIL: TestORSet_MergeTags (0.00s)
    crdt_test.go:562: expected 2 tags after merge, got 1
--- FAIL: TestORSet_MergeIdempotentPreservesTagsAndCounters (0.00s)
    crdt_test.go:604: expected x to keep exactly 2 tags after repeated merges, got 1
--- FAIL: TestORSet_ConcurrentBidirectionalMerge (0.00s)
    crdt_test.go:650: expected shared to have 2 tags after concurrent merge, got 1
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/crdt/counter.go, pkg/crdt/crdt_test.go, pkg/crdt/ormap.go, pkg/crdt/register.go, pkg/crdt/rga.go, pkg/crdt/set.go
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
<summary>swarmsync__f090d17__eYLFo9w: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__f090d17`
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
hidden reference tests: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/crdt/...` exited 1
STDOUT:
--- FAIL: TestORSet_MergeTags (0.00s)
    crdt_test.go:508: expected 2 tags after merge, got 1
--- FAIL: TestORSet_MergePreservesLocalAdditions (0.00s)
    crdt_test.go:527: expected shared element to retain both add tags, got 1
--- FAIL: TestORSet_BidirectionalMergeConcurrentAdds (0.00s)
    crdt_test.go:551: expected shared element to have both concurrent add tags, got 1
--- FAIL: TestORSet_MergeIdempotent (0.00s)
    crdt_test.go:587: expected idempotent merge to keep two unique tags for x, got 1
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.004s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/crdt/counter.go, pkg/crdt/crdt_test.go, pkg/crdt/ormap.go, pkg/crdt/register.go, pkg/crdt/rga.go, pkg/crdt/set.go
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
<summary>swarmsync__f090d17__tbab5SY: PASS, score 1.000, criteria 20/20</summary>

- Task: `swarmsync__f090d17`
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
hidden reference tests: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/crdt/...` exited 1
STDOUT:
--- FAIL: TestORSet_MergeTags (0.00s)
    crdt_test.go:520: expected 2 tags after merge, got 1
--- FAIL: TestORSet_MergePreservesLocalAdditions (0.00s)
    crdt_test.go:539: expected union of local and remote tags for x, got 1
--- FAIL: TestORSet_BidirectionalMergeConverges (0.00s)
    crdt_test.go:581: expected shared element to have 2 tags, got 1
--- FAIL: TestORSet_ConcurrentAddsAcrossReplicas (0.00s)
    crdt_test.go:612: expected 100 tags after merging concurrent adds, got 50
FAIL
FAIL	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/crdt/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/SwarmSync/pkg/crdt	0.002s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: pkg/crdt/counter.go, pkg/crdt/crdt_test.go, pkg/crdt/ormap.go, pkg/crdt/register.go, pkg/crdt/rga.go, pkg/crdt/set.go
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

