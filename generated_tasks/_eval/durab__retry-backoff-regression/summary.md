# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | durab__retry-backoff-regression__8FmT6x9 | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | durab__retry-backoff-regression__DcRskcz | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | durab__retry-backoff-regression__E5ApfLQ | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | durab__retry-backoff-regression__KD85dic | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| durab__retry-backoff-regression | codex | openai/gpt-5.5 | high | durab__retry-backoff-regression__LiwkLhx | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>durab__retry-backoff-regression__8FmT6x9: FAIL, score 0.000, criteria 19/20</summary>

- Task: `durab__retry-backoff-regression`
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
hidden reference tests: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.093s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./internal/engine/` exited 1
STDOUT:
{"time":"2026-06-22T21:51:03.003855464Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0003N5H9BTTQCGC88","type":"T"}
{"time":"2026-06-22T21:51:03.003984172Z","level":"INFO","msg":"workflow started","exec":"wf-p/000037QHA0004D23PYNY12SAJG","type":"T"}
{"time":"2026-06-22T21:51:03.003994339Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA00068XRDM4ZT51F68","type":"T"}
{"time":"2026-06-22T21:51:03.00400113Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA0008RY7RCKN212S7C","type":"T"}
{"time":"2026-06-22T21:51:03.00400688Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA000AZEPP398RN3F74","type":"T"}
{"time":"2026-06-22T21:51:03.004012464Z","level":"INFO","msg":"workflow started","exec":"wf-d/000037QHA000D03ATTSC8H1B9W","type":"T"}
{"time":"2026-06-22T21:51:03.004018255Z","level":"INFO","msg":"workflow started","exec":"wf-e/000037QHA000EXQPY8C16M1GG8","type":"T"}
{"time":"2026-06-22T21:51:03.004024089Z","level":"INFO","msg":"workflow started","exec":"wf-f/000037QHA000GXFTB8X6R6D8YM","type":"T"}
{"time":"2026-06-22T21:51:03.00402938Z","level":"INFO","msg":"workflow started","exec":"wf-g/000037QHA000KMG574M7DH1BQ4","type":"T"}
{"time":"2026-06-22T21:51:03.004037714Z","level":"INFO","msg":"workflow started","exec":"wf-h/000037QHA000M7N39QE3QF5HBM","type":"T"}
{"time":"2026-06-22T21:51:03.004043422Z","level":"INFO","msg":"workflow started","exec":"wf-i/000037QHA000QRYEPK02FR4RQ8","type":"T"}
{"time":"2026-06-22T21:51:03.004048797Z","level":"INFO","msg":"workflow started","exec":"wf-j/000037QHA000RGNQJT682NB2QM","type":"T"}
{"time":"2026-06-22T21:51:03.00405488Z","level":"INFO","msg":"workflow started","exec":"wf-k/000037QHA000T1AV2539AWA9T0","type":"T"}
{"time":"2026-06-22T21:51:03.004060339Z","level":"INFO","msg":"workflow started","exec":"wf-l/000037QHA000WJ8NCCQR9A7YWW","type":"T"}
{"time":"2026-06-22T21:51:03.004065672Z","level":"INFO","msg":"workflow started","exec":"wf-m/000037QHA000ZNERZFGWHYHVTM","type":"T"}
{"time":"2026-06-22T21:51:03.004076714Z","level":"INFO","msg":"workflow started","exec":"wf-n/000037QHA00109SZ8CGSRZ39VR","type":"T"}
{"time":"2026-06-22T21:51:03.004082547Z","level":"INFO","msg":"workflow started","exec":"wf-o/000037QHA0013QHWV7XZXFH8Y0","type":"T"}
{"time":"2026-06-22T21:51:03.004127547Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0015Z9M1D2JFQAFV0","type":"Loop"}
{"time":"2026-06-22T21:51:03.004171172Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0017W9K710SREZCK4","type":"T"}
{"time":"2026-06-22T21:51:03.004235505Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA0018E3W08AHEX0QVR","type":"T"}
{"time":"2026-06-22T21:51:03.004248297Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA001AXAQ39RRB8CBJC","type":"T"}
{"time":"2026-06-22T21:51:03.004250922Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA001CWEK9X1HW59V5W","type":"T"}
{"time":"2026-06-22T21:51:03.004275339Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001FVR5JCNBEKNTD0","type":"T"}
{"time":"2026-06-22T21:51:03.00430588Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001H07B9ZJMD2TRKC","type":"T"}
{"time":"2026-06-22T21:51:03.004362297Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001KM92YY67VHXTE4","type":"T"}
{"time":"2026-06-22T21:51:03.004414797Z","level":"INFO","msg":"workflow started","exec":"wf-1/000037QHA001NCWT5DX1NZTF7M","type":"Greet"}
{"time":"2026-06-22T21:51:03.004461505Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001QQJ83511BXW92M","type":"T"}
{"time":"2026-06-22T21:51:03.004490339Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001RJ0G12V5X3DRK4","type":"T"}
{"time":"2026-06-22T21:51:03.004503505Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001TQG6HZQME1WS7R","type":"T"}
{"time":"2026-06-22T21:51:03.004614922Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001W0EFEZXAV6G6P4","type":"T"}
{"time":"2026-06-22T21:51:03.004728922Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001YTM7FCZDQE9CRC","type":"T"}
{"time":"2026-06-22T21:51:03.004780172Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00218NSDBA33KPWRR","type":"T"}
{"time":"2026-06-22T21:51:03.004842839Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0022J44X4V3NZA3TW","type":"T"}
{"time":"2026-06-22T21:51:03.004897214Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0024XQYZKYT0KT168","type":"T"}
{"time":"2026-06-22T21:51:03.088505714Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0026387CT9ASS6NV8","type":"T"}
{"time":"2026-06-22T21:51:03.088552714Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0028EM32WB9GD63E8","type":"T"}
{"time":"2026-06-22T21:51:03.088569672Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002B59ERXY17DG6TC","type":"T"}
{"time":"2026-06-22T21:51:03.088596839Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002CBPSHR0T3S70J8","type":"T"}
{"time":"2026-06-22T21:51:03.088687505Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002EAF6XSQVNRQYSM","type":"T"}
--- FAIL: TestNextRetryAppliesPolicyScheduleAndMaxAttempts (0.00s)
    --- FAIL: TestNextRetryAppliesPolicyScheduleAndMaxAttempts/first_retry_waits_initial_interval (0.00s)
        retry_activity_test.go:74: NextRetry() = (200ms, true), want (100ms, true)
    --- FAIL: TestNextRetryAppliesPolicyScheduleAndMaxAttempts/later_retry_grows_by_coefficient (0.00s)
        retry_activity_test.go:74: NextRetry() = (250ms, true), want (200ms, true)
    --- FAIL: TestNextRetryAppliesPolicyScheduleAndMaxAttempts/max_attempts_allows_no_extra_retry (0.00s)
        retry_activity_test.go:74: NextRetry() = (250ms, true), want (0s, false)
    --- FAIL: TestNextRetryAppliesPolicyScheduleAndMaxAttempts/single_attempt_policy_has_no_retry (0.00s)
        retry_activity_test.go:74: NextRetry() = (200ms, true), want (0s,
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.090s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: internal/storage/memory.go, internal/storage/sqlite.go, internal/wasm/host_workflow.go, internal/wasm/testbuild.go, internal/worker/worker.go
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
<summary>durab__retry-backoff-regression__DcRskcz: FAIL, score 0.000, criteria 19/20</summary>

- Task: `durab__retry-backoff-regression`
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
hidden reference tests: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.098s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./internal/engine/` exited 1
STDOUT:
{"time":"2026-06-22T21:54:15.027236844Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC003XWTJ3PGKD7S2R","type":"T"}
{"time":"2026-06-22T21:54:15.027362303Z","level":"INFO","msg":"workflow started","exec":"wf-p/000037QHAC004XKJBX41JSXTBM","type":"T"}
{"time":"2026-06-22T21:54:15.027375469Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHAC007BBNJNMEAXVZ6G","type":"T"}
{"time":"2026-06-22T21:54:15.027381136Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHAC008C4ZPJMSRFCETW","type":"T"}
{"time":"2026-06-22T21:54:15.027386761Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHAC00B9P08013H9A1C4","type":"T"}
{"time":"2026-06-22T21:54:15.027398761Z","level":"INFO","msg":"workflow started","exec":"wf-j/000037QHAC00DY6VMNBTGDA490","type":"T"}
{"time":"2026-06-22T21:54:15.027404053Z","level":"INFO","msg":"workflow started","exec":"wf-k/000037QHAC00FE6MYPDHV6R74R","type":"T"}
{"time":"2026-06-22T21:54:15.027414428Z","level":"INFO","msg":"workflow started","exec":"wf-l/000037QHAC00GXWKFR8E9WPB6G","type":"T"}
{"time":"2026-06-22T21:54:15.027419136Z","level":"INFO","msg":"workflow started","exec":"wf-m/000037QHAC00K34KRDKYR9DZQM","type":"T"}
{"time":"2026-06-22T21:54:15.027427678Z","level":"INFO","msg":"workflow started","exec":"wf-n/000037QHAC00MK0FD0BKGB5Z40","type":"T"}
{"time":"2026-06-22T21:54:15.027433219Z","level":"INFO","msg":"workflow started","exec":"wf-o/000037QHAC00S4BTRMXFQYVZWM","type":"T"}
{"time":"2026-06-22T21:54:15.027439844Z","level":"INFO","msg":"workflow started","exec":"wf-g/000037QHAC00XM5CNH7C07AA18","type":"T"}
{"time":"2026-06-22T21:54:15.027452219Z","level":"INFO","msg":"workflow started","exec":"wf-d/000037QHAC00YE3G156FW2R26W","type":"T"}
{"time":"2026-06-22T21:54:15.027460928Z","level":"INFO","msg":"workflow started","exec":"wf-h/000037QHAC010YG3CZXPCB2WSG","type":"T"}
{"time":"2026-06-22T21:54:15.027470511Z","level":"INFO","msg":"workflow started","exec":"wf-f/000037QHAC00V6SVEYP2TXFYNM","type":"T"}
{"time":"2026-06-22T21:54:15.027497469Z","level":"INFO","msg":"workflow started","exec":"wf-i/000037QHAC00QVY3E135XKA3G8","type":"T"}
{"time":"2026-06-22T21:54:15.027555928Z","level":"INFO","msg":"workflow started","exec":"wf-e/000037QHAC0132TDZ0BVEXM8CC","type":"T"}
{"time":"2026-06-22T21:54:15.027618136Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01599BWAVD6YMTYR","type":"Loop"}
{"time":"2026-06-22T21:54:15.027678136Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC016NG5RQPHATFTM0","type":"T"}
{"time":"2026-06-22T21:54:15.027721636Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHAC0198263FDK8SVV80","type":"T"}
{"time":"2026-06-22T21:54:15.027728469Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHAC01AN7H6QAEJ5JM0G","type":"T"}
{"time":"2026-06-22T21:54:15.027730803Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHAC01C8AMNGKN05ABJM","type":"T"}
{"time":"2026-06-22T21:54:15.027764344Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01ERGFH9BNZ557HM","type":"T"}
{"time":"2026-06-22T21:54:15.027788553Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01HG1S2QFWE747C4","type":"T"}
{"time":"2026-06-22T21:54:15.027849303Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01KR92WDAEQFM8AR","type":"T"}
{"time":"2026-06-22T21:54:15.027876636Z","level":"INFO","msg":"workflow started","exec":"wf-1/000037QHAC01M81789MDRXX4J0","type":"Greet"}
{"time":"2026-06-22T21:54:15.027896469Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01QQ0H91VDK0F9HW","type":"T"}
{"time":"2026-06-22T21:54:15.027905636Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01RD73CNG1DW1C1R","type":"T"}
{"time":"2026-06-22T21:54:15.027927594Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01TPFEJ9RWR4ZM98","type":"T"}
{"time":"2026-06-22T21:54:15.027952553Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01XW0HRTWZM9QBN8","type":"T"}
{"time":"2026-06-22T21:54:15.027988678Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC01Y3J07SMT0EMH0W","type":"T"}
{"time":"2026-06-22T21:54:15.028022719Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC021QW1QQMNGJNWJR","type":"T"}
{"time":"2026-06-22T21:54:15.028070469Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC023B8W910MG4AGFC","type":"T"}
{"time":"2026-06-22T21:54:15.028105928Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC025SFSFKD835XW14","type":"T"}
{"time":"2026-06-22T21:54:15.123416386Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC027XQ931W642BWFR","type":"T"}
{"time":"2026-06-22T21:54:15.123458178Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC029DMGKJ53YW0J84","type":"T"}
{"time":"2026-06-22T21:54:15.123474303Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02BYVQP2G5TZMQJ0","type":"T"}
{"time":"2026-06-22T21:54:15.123492011Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02D30359HJHFYX9W","type":"T"}
{"time":"2026-06-22T21:54:15.123588095Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02F1NHNTX3TV3X78","type":"T"}
{"time":"2026-06-22T21:54:15.123625345Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02HCJE1B56KVDSD0","type":"T"}
{"time":"2026-06-22T21:54:15.12368597Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02JGREH0SH6KYNMM","type":"T"}
--- FAIL: TestActivityRetryStopsAtMaxAttempts (0.00s)
    retry_activity_test.go:108: retry activity task missing
{"time":"2026-06-22T21:54:15.12374272Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHAC02NTJ1CRNEW6411C","type":"T"}
--- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts (0.00s)
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/first_retry_waits_initial_interval (0.00s)
        retry_test.go:38: delay=300ms want 100ms
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/second_retry_applies_one_coeff
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.101s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: internal/storage/memory.go, internal/storage/sqlite.go, internal/wasm/host_workflow.go, internal/wasm/testbuild.go, internal/worker/worker.go
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
<summary>durab__retry-backoff-regression__E5ApfLQ: FAIL, score 0.000, criteria 19/20</summary>

- Task: `durab__retry-backoff-regression`
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
hidden reference tests: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.097s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./internal/engine/` exited 1
STDOUT:
{"time":"2026-06-22T21:51:31.41334663Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4002K0BNGAEPX9YER","type":"T"}
{"time":"2026-06-22T21:51:31.413473796Z","level":"INFO","msg":"workflow started","exec":"wf-p/000037QHA4004QA2KMFQ3KBGX4","type":"T"}
{"time":"2026-06-22T21:51:31.413487296Z","level":"INFO","msg":"workflow started","exec":"wf-f/000037QHA4008PZD3M4CBPBR7R","type":"T"}
{"time":"2026-06-22T21:51:31.413493921Z","level":"INFO","msg":"workflow started","exec":"wf-g/000037QHA400AJMZX5NNQJNQR4","type":"T"}
{"time":"2026-06-22T21:51:31.413499213Z","level":"INFO","msg":"workflow started","exec":"wf-h/000037QHA400C7FJNRZ65R5M0W","type":"T"}
{"time":"2026-06-22T21:51:31.413504505Z","level":"INFO","msg":"workflow started","exec":"wf-i/000037QHA400E8N28PHMVNHBKM","type":"T"}
{"time":"2026-06-22T21:51:31.413514338Z","level":"INFO","msg":"workflow started","exec":"wf-j/000037QHA400GMNBEZ10MEN0GM","type":"T"}
{"time":"2026-06-22T21:51:31.413519671Z","level":"INFO","msg":"workflow started","exec":"wf-k/000037QHA400KMPTVVV5H92YWG","type":"T"}
{"time":"2026-06-22T21:51:31.413516005Z","level":"INFO","msg":"workflow started","exec":"wf-e/000037QHA4007YH2TNV28RZXJW","type":"T"}
{"time":"2026-06-22T21:51:31.413546505Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA400MYP1ZPQQHPN3KW","type":"T"}
{"time":"2026-06-22T21:51:31.413558005Z","level":"INFO","msg":"workflow started","exec":"wf-m/000037QHA400R051ESQWD0TTKW","type":"T"}
{"time":"2026-06-22T21:51:31.413551296Z","level":"INFO","msg":"workflow started","exec":"wf-d/000037QHA400ZKE045V2QPECCC","type":"T"}
{"time":"2026-06-22T21:51:31.41360663Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA40111RVV0M3871J4M","type":"T"}
{"time":"2026-06-22T21:51:31.413632088Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA4012QKCGQ92T15WR0","type":"T"}
{"time":"2026-06-22T21:51:31.413791296Z","level":"INFO","msg":"workflow started","exec":"wf-n/000037QHA400VWEV2DCC8KBM14","type":"T"}
{"time":"2026-06-22T21:51:31.413802255Z","level":"INFO","msg":"workflow started","exec":"wf-o/000037QHA400X1NEQ7DC3HG4WR","type":"T"}
{"time":"2026-06-22T21:51:31.413809963Z","level":"INFO","msg":"workflow started","exec":"wf-l/000037QHA400Q4BBHVK2Y2TPC0","type":"T"}
{"time":"2026-06-22T21:51:31.41385138Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4015FPKRQ19227EMW","type":"Loop"}
{"time":"2026-06-22T21:51:31.413915088Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4017507Z5675BJJ6M","type":"T"}
{"time":"2026-06-22T21:51:31.41395438Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA40187F4NA0C1DSC58","type":"T"}
{"time":"2026-06-22T21:51:31.413961088Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA401BXAHQ0NPBEDPBM","type":"T"}
{"time":"2026-06-22T21:51:31.413963796Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA401D25R1PFD3CYA24","type":"T"}
{"time":"2026-06-22T21:51:31.413990463Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401ED3Q79TAHES02G","type":"T"}
{"time":"2026-06-22T21:51:31.414007005Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401G12F99FB999GEC","type":"T"}
{"time":"2026-06-22T21:51:31.414059713Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401JYR908ETQ609P0","type":"T"}
{"time":"2026-06-22T21:51:31.414083046Z","level":"INFO","msg":"workflow started","exec":"wf-1/000037QHA401MV8FE9SDJJSBXC","type":"Greet"}
{"time":"2026-06-22T21:51:31.414092255Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401Q77GW82EGW7BF0","type":"T"}
{"time":"2026-06-22T21:51:31.41410613Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401R20KXJARMW4G4M","type":"T"}
{"time":"2026-06-22T21:51:31.414117296Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401VMVEXTJ69T971G","type":"T"}
{"time":"2026-06-22T21:51:31.414137088Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401W5XTNZG995QJ0R","type":"T"}
{"time":"2026-06-22T21:51:31.414169255Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA401YSX1F970B7WAD0","type":"T"}
{"time":"2026-06-22T21:51:31.414193505Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA40203YYZ9YVFGB8PW","type":"T"}
{"time":"2026-06-22T21:51:31.41424088Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4022PWGG96DNYHKN4","type":"T"}
{"time":"2026-06-22T21:51:31.41427413Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4024Z8DMSHYT775RM","type":"T"}
{"time":"2026-06-22T21:51:31.510368671Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4027K7BMAKG698EM8","type":"T"}
{"time":"2026-06-22T21:51:31.510402963Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA4028VNNJ073AQCG58","type":"T"}
{"time":"2026-06-22T21:51:31.510414755Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402BGCSMN6ZNX1K78","type":"T"}
{"time":"2026-06-22T21:51:31.51042863Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402DC0BYBESCTC5EM","type":"T"}
{"time":"2026-06-22T21:51:31.510584213Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402F71VGGGF9Y2BXM","type":"T"}
{"time":"2026-06-22T21:51:31.510617546Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402GSZ77Z1D3KH428","type":"T"}
{"time":"2026-06-22T21:51:31.510670005Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402J3SEW4P6169WSM","type":"T"}
--- FAIL: TestActivityRetryBackoffAndMaxAttemptsBoundary (0.00s)
    retry_activity_test.go:108: second activity poll ok=false err=<nil>
{"time":"2026-06-22T21:51:31.510727963Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA402N707FD6NTJETW0","type":"T"}
--- FAIL: TestNextRetryBackoffAndMaxAttempts (0.00s)
    --- FAIL: TestNextRetryBackoffAndMaxAttempts/first_retry_uses_initial_interval (0.00s)
        retry_test.go:38: delay = 200ms, want 100ms
    --- FAIL: TestNextRetryBackoffAndMaxAttempts/second_retry_applies_coefficient_on
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.098s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: internal/storage/memory.go, internal/storage/sqlite.go, internal/wasm/host_workflow.go, internal/wasm/testbuild.go, internal/worker/worker.go
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
<summary>durab__retry-backoff-regression__KD85dic: FAIL, score 0.000, criteria 19/20</summary>

- Task: `durab__retry-backoff-regression`
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
hidden reference tests: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.098s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./internal/engine/` exited 1
STDOUT:
{"time":"2026-06-22T21:50:59.517179879Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00031X1BWW59TP2YG","type":"T"}
{"time":"2026-06-22T21:50:59.517308004Z","level":"INFO","msg":"workflow started","exec":"wf-p/000037QHA0005B3ZAKTGDQGQNW","type":"T"}
{"time":"2026-06-22T21:50:59.51732192Z","level":"INFO","msg":"workflow started","exec":"wf-g/000037QHA0009ED2EQWZDN0P94","type":"T"}
{"time":"2026-06-22T21:50:59.517328212Z","level":"INFO","msg":"workflow started","exec":"wf-h/000037QHA000BSCNSSQT2W6VQ8","type":"T"}
{"time":"2026-06-22T21:50:59.517334212Z","level":"INFO","msg":"workflow started","exec":"wf-i/000037QHA000DYB3557S35VJW8","type":"T"}
{"time":"2026-06-22T21:50:59.517344129Z","level":"INFO","msg":"workflow started","exec":"wf-j/000037QHA000E162K04E3VCK8G","type":"T"}
{"time":"2026-06-22T21:50:59.517349629Z","level":"INFO","msg":"workflow started","exec":"wf-k/000037QHA000HH68GG5B8D2EPC","type":"T"}
{"time":"2026-06-22T21:50:59.51735992Z","level":"INFO","msg":"workflow started","exec":"wf-l/000037QHA000J27QA6537ZGQKW","type":"T"}
{"time":"2026-06-22T21:50:59.517346962Z","level":"INFO","msg":"workflow started","exec":"wf-f/000037QHA0006ECB8M6E0A5TTC","type":"T"}
{"time":"2026-06-22T21:50:59.51736892Z","level":"INFO","msg":"workflow started","exec":"wf-m/000037QHA000NTBG90EBM69RYW","type":"T"}
{"time":"2026-06-22T21:50:59.51737692Z","level":"INFO","msg":"workflow started","exec":"wf-n/000037QHA000QTQRJRNVZBFP1G","type":"T"}
{"time":"2026-06-22T21:50:59.517384045Z","level":"INFO","msg":"workflow started","exec":"wf-o/000037QHA000TV0AQQD4P4C6G0","type":"T"}
{"time":"2026-06-22T21:50:59.517388004Z","level":"INFO","msg":"workflow started","exec":"wf-d/000037QHA000SS3T76D58F9M2W","type":"T"}
{"time":"2026-06-22T21:50:59.517395379Z","level":"INFO","msg":"workflow started","exec":"wf-e/000037QHA000X556GAQWK180FW","type":"T"}
{"time":"2026-06-22T21:50:59.517399504Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA000Y1BGMHJPBFS790","type":"T"}
{"time":"2026-06-22T21:50:59.517459712Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA00118VQP6FF3KM7ZR","type":"T"}
{"time":"2026-06-22T21:50:59.517473045Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA0013JG4RQ7QYMXR58","type":"T"}
{"time":"2026-06-22T21:50:59.517518295Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0015KTREV5XEN6H6G","type":"Loop"}
{"time":"2026-06-22T21:50:59.517574504Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00167G8VAVJSFTET4","type":"T"}
{"time":"2026-06-22T21:50:59.517611545Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA0018CWHHF96QF2R2C","type":"T"}
{"time":"2026-06-22T21:50:59.517618295Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA001AVXF39AX96A55R","type":"T"}
{"time":"2026-06-22T21:50:59.517620962Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA001C2H3JP2J054F7C","type":"T"}
{"time":"2026-06-22T21:50:59.517647295Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001E9DFMARHHNRGCG","type":"T"}
{"time":"2026-06-22T21:50:59.517668587Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001G30C0VF3J1KHRR","type":"T"}
{"time":"2026-06-22T21:50:59.517726295Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001KJ6YJ27C8FCFK0","type":"T"}
{"time":"2026-06-22T21:50:59.517748837Z","level":"INFO","msg":"workflow started","exec":"wf-1/000037QHA001NX8P3N6K9PWQS4","type":"Greet"}
{"time":"2026-06-22T21:50:59.517762295Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001PCYQTH5D60K31M","type":"T"}
{"time":"2026-06-22T21:50:59.517770795Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001SF3S3YVNAREA5G","type":"T"}
{"time":"2026-06-22T21:50:59.517787004Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001VPSP4GMKC7BNER","type":"T"}
{"time":"2026-06-22T21:50:59.517801212Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001WYBVNXBCD7KK8C","type":"T"}
{"time":"2026-06-22T21:50:59.51783717Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001YFF2MV98Z4FDPC","type":"T"}
{"time":"2026-06-22T21:50:59.517862712Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002100CGCNQW2WRK0","type":"T"}
{"time":"2026-06-22T21:50:59.517898879Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0022WS7DDF2H9FVSW","type":"T"}
{"time":"2026-06-22T21:50:59.517930879Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00246ZYPMJ546NGSC","type":"T"}
{"time":"2026-06-22T21:50:59.612057004Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0026QMK3FQDJ59JAW","type":"T"}
{"time":"2026-06-22T21:50:59.612108545Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00296FCQYP8DZ4768","type":"T"}
{"time":"2026-06-22T21:50:59.612133962Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002B8X3BFP9AWDB0W","type":"T"}
{"time":"2026-06-22T21:50:59.612165837Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002D96WX29R8KPT7M","type":"T"}
{"time":"2026-06-22T21:50:59.61224742Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002FCCAXXVHMNQ7XR","type":"T"}
--- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts (0.00s)
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/first_retry_uses_initial_interval (0.00s)
        retry_activity_test.go:42: NextRetry(attempt=1) = 3s, true; want 1s, true
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/second_retry_applies_coefficient_once (0.00s)
        retry_activity_test.go:42: NextRetry(attempt=2) = 5s, true; want 3s, true
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/max_attempts_has_no_extra_retry (0.00s)
        retry_activity_test.go:42: NextRetry(attempt=5) = 5s, true; want 0s, false
    retry_activity_test.go:53: unset interval defaults retry = 2s, true; want 1s, true
{"time":"2026-06-22T21:50:59.612414337Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002HXBDT1A9FB0K3
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.091s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: internal/storage/memory.go, internal/storage/sqlite.go, internal/wasm/host_workflow.go, internal/wasm/testbuild.go, internal/worker/worker.go
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
<summary>durab__retry-backoff-regression__LiwkLhx: FAIL, score 0.000, criteria 19/20</summary>

- Task: `durab__retry-backoff-regression`
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
hidden reference tests: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.089s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./internal/engine/` exited 1
STDOUT:
{"time":"2026-06-22T21:50:57.734207128Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0003KJ2GTXY2TE04W","type":"T"}
{"time":"2026-06-22T21:50:57.73436217Z","level":"INFO","msg":"workflow started","exec":"wf-p/000037QHA0005P52M3GRN78Q20","type":"T"}
{"time":"2026-06-22T21:50:57.734375086Z","level":"INFO","msg":"workflow started","exec":"wf-j/000037QHA00094BN2SRQ2QGCKG","type":"T"}
{"time":"2026-06-22T21:50:57.734381378Z","level":"INFO","msg":"workflow started","exec":"wf-k/000037QHA000BCAST2FWDT9FAR","type":"T"}
{"time":"2026-06-22T21:50:57.73438742Z","level":"INFO","msg":"workflow started","exec":"wf-l/000037QHA000DS9T9T3RRY7V3G","type":"T"}
{"time":"2026-06-22T21:50:57.734393211Z","level":"INFO","msg":"workflow started","exec":"wf-m/000037QHA000EWXD3F4Q6KJ674","type":"T"}
{"time":"2026-06-22T21:50:57.734390503Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA00078SYD2YC3JZDF8","type":"T"}
{"time":"2026-06-22T21:50:57.734399836Z","level":"INFO","msg":"workflow started","exec":"wf-n/000037QHA000GXZFZHBC7RE1AR","type":"T"}
{"time":"2026-06-22T21:50:57.734405586Z","level":"INFO","msg":"workflow started","exec":"wf-o/000037QHA000K4YHVNYYPZPPZG","type":"T"}
{"time":"2026-06-22T21:50:57.734419045Z","level":"INFO","msg":"workflow started","exec":"wf-f/000037QHA000NNR8F1TA4FZMQW","type":"T"}
{"time":"2026-06-22T21:50:57.734421836Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA000QMQN7YSBVBQYB0","type":"T"}
{"time":"2026-06-22T21:50:57.734429086Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA000SXH9TV4661JWDC","type":"T"}
{"time":"2026-06-22T21:50:57.734438545Z","level":"INFO","msg":"workflow started","exec":"wf-d/000037QHA000VJ5CZ5MZ4REK34","type":"T"}
{"time":"2026-06-22T21:50:57.734444711Z","level":"INFO","msg":"workflow started","exec":"wf-e/000037QHA000X0F93VCEQ2WNZ0","type":"T"}
{"time":"2026-06-22T21:50:57.734445461Z","level":"INFO","msg":"workflow started","exec":"wf-g/000037QHA000Y02A01S4M7BJS4","type":"T"}
{"time":"2026-06-22T21:50:57.734499086Z","level":"INFO","msg":"workflow started","exec":"wf-i/000037QHA0010X8M8AY9A59FKM","type":"T"}
{"time":"2026-06-22T21:50:57.734520961Z","level":"INFO","msg":"workflow started","exec":"wf-h/000037QHA0012ACAPE0N1CVSA8","type":"T"}
{"time":"2026-06-22T21:50:57.734566461Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0014VVMMJ71CFH0S8","type":"Loop"}
{"time":"2026-06-22T21:50:57.734623836Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00171XYJN1JB17FRC","type":"T"}
{"time":"2026-06-22T21:50:57.734661045Z","level":"INFO","msg":"workflow started","exec":"wf-a/000037QHA00193MHCZP4V1HCS8","type":"T"}
{"time":"2026-06-22T21:50:57.734667961Z","level":"INFO","msg":"workflow started","exec":"wf-b/000037QHA001BZ3DMS2VJ7BC4C","type":"T"}
{"time":"2026-06-22T21:50:57.734670128Z","level":"INFO","msg":"workflow started","exec":"wf-c/000037QHA001CAPM7E38XJGKBW","type":"T"}
{"time":"2026-06-22T21:50:57.734695336Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001ERXK2FVG632DNW","type":"T"}
{"time":"2026-06-22T21:50:57.734714628Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001GVB6A640WH37BG","type":"T"}
{"time":"2026-06-22T21:50:57.73477367Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001KPJ6YP05SPCCH4","type":"T"}
{"time":"2026-06-22T21:50:57.734800295Z","level":"INFO","msg":"workflow started","exec":"wf-1/000037QHA001N8NAVWR6VA31HC","type":"Greet"}
{"time":"2026-06-22T21:50:57.734814836Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001PVE4TA5VGF203W","type":"T"}
{"time":"2026-06-22T21:50:57.734824003Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001SP0G1WA675HH3W","type":"T"}
{"time":"2026-06-22T21:50:57.734836003Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001VPA60QTWYY48MW","type":"T"}
{"time":"2026-06-22T21:50:57.734858378Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001XZ3PFGZ27HDQA0","type":"T"}
{"time":"2026-06-22T21:50:57.734887503Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA001ZSR103F3SGZ07G","type":"T"}
{"time":"2026-06-22T21:50:57.73491417Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA00203HVWJDVAG2SG4","type":"T"}
{"time":"2026-06-22T21:50:57.734949295Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002252JF75E06CSCR","type":"T"}
{"time":"2026-06-22T21:50:57.734980836Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002521NG573DG12QM","type":"T"}
{"time":"2026-06-22T21:50:57.820353045Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0026Q64KHNSTRH5SR","type":"T"}
{"time":"2026-06-22T21:50:57.820397753Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA0029FD81M9CH8CZ94","type":"T"}
{"time":"2026-06-22T21:50:57.820417961Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002AT7EA6HJCB2DHR","type":"T"}
{"time":"2026-06-22T21:50:57.820440336Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002C0NMR1A5E951M0","type":"T"}
{"time":"2026-06-22T21:50:57.820510045Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002F9H3P3RVDMNGNC","type":"T"}
{"time":"2026-06-22T21:50:57.82055142Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002H1KCX0JYV938M4","type":"T"}
--- FAIL: TestActivityFailureRetriesUnderPolicy (0.00s)
    retry_activity_test.go:62: retry task should be visible at initial backoff
{"time":"2026-06-22T21:50:57.82061117Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002K7EP8M5XNR41E8","type":"T"}
--- FAIL: TestActivityFailureDoesNotRetryBeyondMaxAttempts (0.00s)
    retry_activity_test.go:105: second attempt should be available after first backoff
{"time":"2026-06-22T21:50:57.820665253Z","level":"INFO","msg":"workflow started","exec":"wf/000037QHA002NR5FY3PAYY13MM","type":"T"}
--- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts (0.00s)
    --- FAIL: TestNextRetryBackoffSequenceAndMaxAttempts/first_re
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./internal/engine/` exited 0
STDOUT:
ok  	github.com/vishaljakhar/durab/internal/engine	0.087s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: internal/storage/memory.go, internal/storage/sqlite.go, internal/wasm/host_workflow.go, internal/wasm/testbuild.go, internal/worker/worker.go
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

