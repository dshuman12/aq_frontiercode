# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 1
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| bco__engine-grace-prior-boost-boundary | codex | openai/gpt-5.5 | high | 1 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| bco__engine-grace-prior-boost-boundary | codex | openai/gpt-5.5 | high | 1 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| bco__engine-grace-prior-boost-boundary | codex | openai/gpt-5.5 | high | bco__engine-grace-prior-boost-bo__e9iNtaa | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, visible_regression_tests_pass |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>bco__engine-grace-prior-boost-bo__e9iNtaa: FAIL, score 0.000, criteria 18/20</summary>

- Task: `bco__engine-grace-prior-boost-boundary`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.000
- Reward: 0.000
- Criteria: 18/20
- Categories: patch_specific 5/6, regular 13/14
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| submitted_tests_fail_on_base | regular | reverse_classical | yes | 0.150 | 1.000 | yes |
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

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `cd bco-core && go test ./...` exited 1
STDOUT:
FAIL	github.com/hvaghani221/bco/bco-core [build failed]
?   	github.com/hvaghani221/bco/bco-core/internal/deps	[no test files]
FAIL

STDERR:
# github.com/hvaghani221/bco/bco-core [github.com/hvaghani221/bco/bco-core.test]
./test_helpers_test.go:5:6: recordingNetwork redeclared in this block
	./engine_test.go:57:6: other declaration of recordingNetwork
./test_helpers_test.go:18:6: newRecordingNetwork redeclared in this block
	./engine_test.go:74:6: other declaration of newRecordingNetwork
./test_helpers_test.go:22:28: method recordingNetwork.Broadcast already declared at ./engine_test.go:98:28
./test_helpers_test.go:28:28: method recordingNetwork.Send already declared at ./engine_test.go:108:28
./test_helpers_test.go:31:19: invalid append: argument must be a slice; have n.sends (variable of type map[string][]*BCOMessage)
./test_helpers_test.go:35:28: method recordingNetwork.ListenMultiaddrs already declared at ./engine_test.go:138:28
./test_helpers_test.go:39:28: method recordingNetwork.TransportConnectedPeerIDs already declared at ./engine_test.go:154:28
./test_helpers_test.go:45:28: method recordingNetwork.ConnectTransitivePeer already declared at ./engine_test.go:165:28
./test_helpers_test.go:51:28: method recordingNetwork.Close already declared at ./engine_test.go:175:28
./test_helpers_test.go:55:6: drainEvents redeclared in this block
	./engine_test.go:214:6: other declaration of drainEvents
./test_helpers_test.go:31:19: too many errors
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `cd bco-core && go test ./...` exited 1
STDOUT:
[2026-06-23T00:10:09.179Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:09.179Z] [INFO] [CAPI] engine 2 started peer=12D3KooWC78ZnkoRhkBt55EdpE7snXhtH8xEkYx2qGgskoqgTg4U
[2026-06-23T00:10:09.189Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:09.189Z] [INFO] [CAPI] engine 3 started peer=12D3KooWMeUw4z6e9AL1uanZ5nTSAWdGSU64cou8rQQtsTiaPZpB
[2026-06-23T00:10:09.189Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=0 (Idle) has_bluetooth=false (reported=false bt_applied=true priority param=0, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:09.189Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-23T00:10:09.189Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWMeUw…) local: audio_priority=0 (Idle) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=0
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-23T00:10:09.189Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=100 (Media) has_bluetooth=false (reported=false bt_applied=true priority param=100, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:09.189Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=2 to 0 peers
[2026-06-23T00:10:09.189Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWMeUw…) local: audio_priority=100 (Media) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=100
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWMeUw…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:09.189Z] [INFO] [Priority] CONNECT_BT event: local "capi-prio-enum" won resolution (audio_priority=100 tier=Media effective_score=100) and reports no headset link — platform should connect saved device
[2026-06-23T00:10:09.189Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=200 (IncomingCall) has_bluetooth=false (reported=false bt_applied=true priority param=200, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:09.189Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=4 to 0 peers
[2026-06-23T00:10:09.189Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWMeUw…) local: audio_priority=200 (IncomingCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=200
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWMeUw…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:09.189Z] [INFO] [Engine] suppressed Bluetooth shell event CONNECT_BT (peer "capi-prio-enum"): cooldown remaining 1.999s
[2026-06-23T00:10:09.189Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=300 (ActiveCall) has_bluetooth=false (reported=false bt_applied=true priority param=300, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:09.189Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=5 to 0 peers
[2026-06-23T00:10:09.189Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWMeUw…) local: audio_priority=300 (ActiveCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=300
[2026-06-23T00:10:09.189Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWMeUw…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:09.195Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:09.195Z] [INFO] [CAPI] engine 4 started peer=12D3KooWPXYWw1TMgPqaEVScrBQritdLLVze9WYmnrJ5B9qqFXns
[2026-06-23T00:10:09.195Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-custom" audio_priority=42 (Tier(42)) has_bluetooth=false (reported=false bt_applied=true priority param=42, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:09.195Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-23T00:10:09.195Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:09.195Z] [INFO] [Priority]   candidate "capi-prio-custom" (12D3KooWPXYW…) local: audio_priority=42 (Tier(42)) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=42
[2026-06-23T00:10:09.195Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-23T00:10:09.202Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:1
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `cd bco-core && go test ./...` exited 1
STDOUT:
[2026-06-23T00:10:13.529Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:13.529Z] [INFO] [CAPI] engine 2 started peer=12D3KooWQg2UEX3RTM7tqk3RoWXdyiTyqCvZUKMWTN937kpk9tHa
[2026-06-23T00:10:13.538Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:13.538Z] [INFO] [CAPI] engine 3 started peer=12D3KooWKvef5NHfbCzaSsWsQBFgNAi5up6fjxQpp21mHfs8GfjB
[2026-06-23T00:10:13.538Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=0 (Idle) has_bluetooth=false (reported=false bt_applied=true priority param=0, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:13.538Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-23T00:10:13.538Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:13.538Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWKvef…) local: audio_priority=0 (Idle) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=0
[2026-06-23T00:10:13.538Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-23T00:10:13.539Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=100 (Media) has_bluetooth=false (reported=false bt_applied=true priority param=100, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:13.539Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=2 to 0 peers
[2026-06-23T00:10:13.539Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWKvef…) local: audio_priority=100 (Media) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=100
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWKvef…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:13.539Z] [INFO] [Priority] CONNECT_BT event: local "capi-prio-enum" won resolution (audio_priority=100 tier=Media effective_score=100) and reports no headset link — platform should connect saved device
[2026-06-23T00:10:13.539Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=200 (IncomingCall) has_bluetooth=false (reported=false bt_applied=true priority param=200, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:13.539Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=4 to 0 peers
[2026-06-23T00:10:13.539Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWKvef…) local: audio_priority=200 (IncomingCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=200
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWKvef…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:13.539Z] [INFO] [Engine] suppressed Bluetooth shell event CONNECT_BT (peer "capi-prio-enum"): cooldown remaining 1.999s
[2026-06-23T00:10:13.539Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-enum" audio_priority=300 (ActiveCall) has_bluetooth=false (reported=false bt_applied=true priority param=300, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:13.539Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=5 to 0 peers
[2026-06-23T00:10:13.539Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   candidate "capi-prio-enum" (12D3KooWKvef…) local: audio_priority=300 (ActiveCall) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=300
[2026-06-23T00:10:13.539Z] [INFO] [Priority]   resolution: winner="capi-prio-enum" (12D3KooWKvef…) — this device should run CONNECT_BT if winner is local and has_bt=false; DISCONNECT_BT if local has_bt=true but winner is another device
[2026-06-23T00:10:13.545Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:10:13.545Z] [INFO] [CAPI] engine 4 started peer=12D3KooWLy8Uor9QWUi357HDGPDAmC4WW691Wy5JFjZpDXNJfeEt
[2026-06-23T00:10:13.545Z] [INFO] [Engine] STATE_UPDATE from platform: "capi-prio-custom" audio_priority=42 (Tier(42)) has_bluetooth=false (reported=false bt_applied=true priority param=42, priority_applied=true, -1 means keep existing)
[2026-06-23T00:10:13.545Z] [INFO] [Engine] [Trace] BCOSendStateUpdate broadcasting seq=1 to 0 peers
[2026-06-23T00:10:13.545Z] [INFO] [Priority] Formula: effective_score = audio_priority + stickiness_bonus + base_bias + manual_connect_bonus; Winner = among non-paused devices, highest effective_score with audio_priority >= 100 (Media); tie-break lexicographic deviceId.
[2026-06-23T00:10:13.545Z] [INFO] [Priority]   candidate "capi-prio-custom" (12D3KooWLy8U…) local: audio_priority=42 (Tier(42)) has_bt=false stickiness_bonus=0 base_bias=0 manual_bonus=0 effective_score=42
[2026-06-23T00:10:13.545Z] [INFO] [Priority]   resolution: no headset holder (no eligible device at or above Media tier)
[2026-06-23T00:10:13.549Z] [INFO] [Network] mDNS discovery started
[2026-06-23T00:1
...<truncated>...
STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: bco-core/engine.go, bco-core/engine_test.go, bco-core/test_helpers_test.go
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

