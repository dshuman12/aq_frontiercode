# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 10
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | 10 | 0.300 | 0.912 | 0.300 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | 10 | 0.300 | 0.912 | 0.300 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__Bgg2HqR | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__LEj2AeK | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__V3XMLnV | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__XbiAyxU | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__YeDbCWJ | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__bG3eDzP | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__inzGnJC | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__mE5vTRU | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__ugEaW3d | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |
| healthcare-integration-platform__0cca2340f9ad | codex | openai/gpt-5.5 | high | healthcare-integration-platform__xh5bL3E | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.875 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>healthcare-integration-platform__Bgg2HqR: PASS, score 1.000, criteria 20/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 144 packages in 26s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4k926cw1/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:56
[2m   Duration [22m 635ms[2m (transform 38ms, setup 0ms, import 51ms, tests 2ms, environment 465ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4k926cw1/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:57
[2m   Duration [22m 692ms[2m (transform 47ms, setup 0ms, import 64ms, tests 3ms, environment 467ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4k926cw1/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:58
[2m   Duration [22m 611ms[2m (transform 39ms, setup 0ms, import 51ms, tests 3ms, environment 426ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4k926cw1/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:59
[2m   Duration [22m 707ms[2m (transform 44ms, setup 0ms, import 57ms, tests 4ms, environment 535ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4k926cw1/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:00
[2m   Duration [22m 635ms[2m (transform 71ms, setup 0ms, import 82ms, tests 2ms, environment 439ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 144 packages in 7s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fzwyxttc/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:01
[2m   Duration [22m 591ms[2m (transform 44ms, setup 0ms, import 54ms, tests 2ms, environment 431ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fzwyxttc/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:02
[2m   Duration [22m 448ms[2m (transform 25ms, setup 0ms, import 33ms, tests 1ms, environment 339ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fzwyxttc/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:02
[2m   Duration [22m 500ms[2m (transform 31ms, setup 0ms, import 41ms, tests 2ms, environment 383ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fzwyxttc/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:03
[2m   Duration [22m 542ms[2m (transform 39ms, setup 0ms, import 50ms, tests 2ms, environment 397ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fzwyxttc/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:04
[2m   Duration [22m 553ms[2m (transform 38ms, setup 0ms, import 57ms, tests 3ms, environment 396ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: .github/workflows/ci.yml, Makefile, package-lock.json, package.json, packages/sdk-go/client_test.go, packages/sdk-go/go.mod, scripts/verify_repository.py
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
<summary>healthcare-integration-platform__LEj2AeK: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 144 packages in 18s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-veg2rziz/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:50
[2m   Duration [22m 768ms[2m (transform 36ms, setup 0ms, import 50ms, tests 2ms, environment 578ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-veg2rziz/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:51
[2m   Duration [22m 413ms[2m (transform 34ms, setup 0ms, import 42ms, tests 2ms, environment 309ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-veg2rziz/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:52
[2m   Duration [22m 479ms[2m (transform 29ms, setup 0ms, import 39ms, tests 2ms, environment 371ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-veg2rziz/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:52
[2m   Duration [22m 490ms[2m (transform 23ms, setup 0ms, import 31ms, tests 1ms, environment 363ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-veg2rziz/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:53
[2m   Duration [22m 388ms[2m (transform 25ms, setup 0ms, import 33ms, tests 1ms, environment 293ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 144 packages in 7s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-8i5ucs3q/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:48
[2m   Duration [22m 479ms[2m (transform 28ms, setup 0ms, import 50ms, tests 1ms, environment 345ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-8i5ucs3q/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:48
[2m   Duration [22m 473ms[2m (transform 39ms, setup 0ms, import 49ms, tests 1ms, environment 348ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-8i5ucs3q/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:49
[2m   Duration [22m 457ms[2m (transform 32ms, setup 0ms, import 40ms, tests 1ms, environment 351ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-8i5ucs3q/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:50
[2m   Duration [22m 709ms[2m (transform 31ms, setup 0ms, import 47ms, tests 3ms, environment 509ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-8i5ucs3q/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:51
[2m   Duration [22m 548ms[2m (transform 39ms, setup 0ms, import 50ms, tests 2ms, environment 401ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml
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
<summary>healthcare-integration-platform__V3XMLnV: PASS, score 1.000, criteria 20/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 21s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-ttsykiyx/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:37
[2m   Duration [22m 464ms[2m (transform 31ms, setup 0ms, import 40ms, tests 1ms, environment 348ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-ttsykiyx/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:37
[2m   Duration [22m 533ms[2m (transform 48ms, setup 0ms, import 62ms, tests 2ms, environment 397ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-ttsykiyx/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:38
[2m   Duration [22m 584ms[2m (transform 43ms, setup 0ms, import 61ms, tests 2ms, environment 420ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-ttsykiyx/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:39
[2m   Duration [22m 599ms[2m (transform 50ms, setup 0ms, import 64ms, tests 3ms, environment 426ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-ttsykiyx/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:40
[2m   Duration [22m 538ms[2m (transform 40ms, setup 0ms, import 53ms, tests 2ms, environment 393ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 8s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-n1doxgei/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:19
[2m   Duration [22m 749ms[2m (transform 44ms, setup 0ms, import 59ms, tests 2ms, environment 558ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-n1doxgei/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:21
[2m   Duration [22m 658ms[2m (transform 43ms, setup 0ms, import 56ms, tests 2ms, environment 474ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-n1doxgei/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:21
[2m   Duration [22m 678ms[2m (transform 39ms, setup 0ms, import 51ms, tests 2ms, environment 504ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-n1doxgei/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:22
[2m   Duration [22m 612ms[2m (transform 50ms, setup 0ms, import 61ms, tests 3ms, environment 419ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-n1doxgei/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:23
[2m   Duration [22m 676ms[2m (transform 78ms, setup 0ms, import 90ms, tests 2ms, environment 473ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: .github/workflows/ci.yml, Makefile, package-lock.json, package.json, packages/sdk-go/client_test.go, packages/sdk-go/go.mod, scripts/verify_repository.py
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
<summary>healthcare-integration-platform__XbiAyxU: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 21s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-lnuz14ti/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:36
[2m   Duration [22m 485ms[2m (transform 33ms, setup 0ms, import 50ms, tests 1ms, environment 348ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-lnuz14ti/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:37
[2m   Duration [22m 538ms[2m (transform 85ms, setup 0ms, import 96ms, tests 2ms, environment 371ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-lnuz14ti/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:38
[2m   Duration [22m 568ms[2m (transform 41ms, setup 0ms, import 54ms, tests 2ms, environment 425ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-lnuz14ti/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:39
[2m   Duration [22m 586ms[2m (transform 41ms, setup 0ms, import 55ms, tests 2ms, environment 420ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-lnuz14ti/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:40
[2m   Duration [22m 591ms[2m (transform 40ms, setup 0ms, import 51ms, tests 2ms, environment 419ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 8s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-phekxbs5/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:19
[2m   Duration [22m 627ms[2m (transform 48ms, setup 0ms, import 66ms, tests 2ms, environment 473ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-phekxbs5/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:20
[2m   Duration [22m 662ms[2m (transform 41ms, setup 0ms, import 54ms, tests 2ms, environment 487ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-phekxbs5/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:21
[2m   Duration [22m 637ms[2m (transform 38ms, setup 0ms, import 54ms, tests 3ms, environment 470ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-phekxbs5/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:22
[2m   Duration [22m 599ms[2m (transform 42ms, setup 0ms, import 55ms, tests 2ms, environment 426ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-phekxbs5/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:23
[2m   Duration [22m 617ms[2m (transform 43ms, setup 0ms, import 59ms, tests 2ms, environment 406ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml
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
<summary>healthcare-integration-platform__YeDbCWJ: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 16s

> healthbridge-monorepo@0.1.0 test
> npm run frontend:test


> healthbridge-monorepo@0.1.0 frontend:test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-h8bylzrm/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:46:43
[2m   Duration [22m 363ms[2m (transform 20ms, setup 0ms, import 28ms, tests 1ms, environment 276ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-h8bylzrm/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:46:43
[2m   Duration [22m 372ms[2m (transform 18ms, setup 0ms, import 26ms, tests 1ms, environment 291ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-h8bylzrm/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:46:44
[2m   Duration [22m 359ms[2m (transform 20ms, setup 0ms, import 27ms, tests 1ms, environment 276ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-h8bylzrm/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:46:44
[2m   Duration [22m 367ms[2m (transform 18ms, setup 0ms, import 25ms, tests 2ms, environment 285ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-h8bylzrm/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:46:45
[2m   Duration [22m 358ms[2m (transform 19ms, setup 0ms, import 26ms, tests 1ms, environment 273ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 6s

> healthbridge-monorepo@0.1.0 test
> npm run frontend:test


> healthbridge-monorepo@0.1.0 frontend:test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-94z3dqk9/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:02
[2m   Duration [22m 596ms[2m (transform 32ms, setup 0ms, import 43ms, tests 2ms, environment 451ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-94z3dqk9/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:03
[2m   Duration [22m 615ms[2m (transform 33ms, setup 0ms, import 45ms, tests 2ms, environment 460ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-94z3dqk9/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:04
[2m   Duration [22m 508ms[2m (transform 41ms, setup 0ms, import 54ms, tests 2ms, environment 374ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-94z3dqk9/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:05
[2m   Duration [22m 566ms[2m (transform 33ms, setup 0ms, import 46ms, tests 3ms, environment 420ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-94z3dqk9/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:47:06
[2m   Duration [22m 624ms[2m (transform 36ms, setup 0ms, import 50ms, tests 2ms, environment 462ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: pyproject.toml
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
<summary>healthcare-integration-platform__bG3eDzP: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 25s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-15nwzcsa/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:55
[2m   Duration [22m 621ms[2m (transform 37ms, setup 0ms, import 48ms, tests 2ms, environment 474ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-15nwzcsa/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:56
[2m   Duration [22m 667ms[2m (transform 82ms, setup 0ms, import 94ms, tests 3ms, environment 461ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-15nwzcsa/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:57
[2m   Duration [22m 793ms[2m (transform 74ms, setup 0ms, import 89ms, tests 3ms, environment 463ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-15nwzcsa/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:58
[2m   Duration [22m 592ms[2m (transform 42ms, setup 0ms, import 55ms, tests 2ms, environment 421ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-15nwzcsa/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:59
[2m   Duration [22m 634ms[2m (transform 46ms, setup 0ms, import 61ms, tests 2ms, environment 466ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 8s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-hbn4cfv_/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:44
[2m   Duration [22m 508ms[2m (transform 40ms, setup 0ms, import 53ms, tests 2ms, environment 368ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-hbn4cfv_/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:45
[2m   Duration [22m 530ms[2m (transform 36ms, setup 0ms, import 45ms, tests 1ms, environment 388ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-hbn4cfv_/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:45
[2m   Duration [22m 553ms[2m (transform 36ms, setup 0ms, import 49ms, tests 2ms, environment 406ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-hbn4cfv_/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:46
[2m   Duration [22m 584ms[2m (transform 42ms, setup 0ms, import 54ms, tests 2ms, environment 425ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-hbn4cfv_/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:47
[2m   Duration [22m 603ms[2m (transform 38ms, setup 0ms, import 53ms, tests 2ms, environment 443ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml
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
<summary>healthcare-integration-platform__inzGnJC: PASS, score 1.000, criteria 20/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 22s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4shbid6a/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:57
[2m   Duration [22m 521ms[2m (transform 29ms, setup 0ms, import 39ms, tests 2ms, environment 381ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4shbid6a/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:58
[2m   Duration [22m 552ms[2m (transform 33ms, setup 0ms, import 44ms, tests 2ms, environment 403ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4shbid6a/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:48:59
[2m   Duration [22m 624ms[2m (transform 49ms, setup 0ms, import 61ms, tests 2ms, environment 453ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4shbid6a/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:49:00
[2m   Duration [22m 630ms[2m (transform 34ms, setup 0ms, import 51ms, tests 2ms, environment 466ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-4shbid6a/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:49:01
[2m   Duration [22m 563ms[2m (transform 42ms, setup 0ms, import 53ms, tests 2ms, environment 409ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 9s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-ox2lyb67/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:50:17
[2m   Duration [22m 813ms[2m (transform 65ms, setup 0ms, import 85ms, tests 4ms, environment 589ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-ox2lyb67/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:50:18
[2m   Duration [22m 793ms[2m (transform 45ms, setup 0ms, import 61ms, tests 3ms, environment 582ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-ox2lyb67/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:50:19
[2m   Duration [22m 870ms[2m (transform 161ms, setup 0ms, import 178ms, tests 4ms, environment 559ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-ox2lyb67/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:50:20
[2m   Duration [22m 773ms[2m (transform 57ms, setup 0ms, import 77ms, tests 3ms, environment 563ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-ox2lyb67/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:50:22
[2m   Duration [22m 814ms[2m (transform 53ms, setup 0ms, import 70ms, tests 3ms, environment 590ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: .github/workflows/ci.yml, Makefile, package-lock.json, package.json, packages/sdk-go/client_test.go, packages/sdk-go/go.mod, scripts/verify_repository.py
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
<summary>healthcare-integration-platform__mE5vTRU: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 20s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-jideiehu/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:27
[2m   Duration [22m 545ms[2m (transform 56ms, setup 0ms, import 70ms, tests 2ms, environment 400ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-jideiehu/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:28
[2m   Duration [22m 474ms[2m (transform 27ms, setup 0ms, import 38ms, tests 2ms, environment 360ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-jideiehu/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:28
[2m   Duration [22m 485ms[2m (transform 31ms, setup 0ms, import 53ms, tests 2ms, environment 336ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-jideiehu/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:29
[2m   Duration [22m 436ms[2m (transform 23ms, setup 0ms, import 30ms, tests 1ms, environment 322ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-jideiehu/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:30
[2m   Duration [22m 483ms[2m (transform 34ms, setup 0ms, import 42ms, tests 2ms, environment 373ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 5s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-44fmortm/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:47
[2m   Duration [22m 424ms[2m (transform 22ms, setup 0ms, import 30ms, tests 1ms, environment 306ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-44fmortm/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:48
[2m   Duration [22m 396ms[2m (transform 24ms, setup 0ms, import 34ms, tests 1ms, environment 288ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-44fmortm/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:48
[2m   Duration [22m 413ms[2m (transform 21ms, setup 0ms, import 29ms, tests 1ms, environment 298ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-44fmortm/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:49
[2m   Duration [22m 413ms[2m (transform 35ms, setup 0ms, import 44ms, tests 2ms, environment 311ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-44fmortm/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:54:50
[2m   Duration [22m 530ms[2m (transform 23ms, setup 0ms, import 32ms, tests 2ms, environment 376ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml
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
<summary>healthcare-integration-platform__ugEaW3d: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 26s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-wts9eh1v/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:55
[2m   Duration [22m 638ms[2m (transform 42ms, setup 0ms, import 57ms, tests 3ms, environment 481ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-wts9eh1v/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:56
[2m   Duration [22m 620ms[2m (transform 37ms, setup 0ms, import 51ms, tests 2ms, environment 464ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-wts9eh1v/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:57
[2m   Duration [22m 713ms[2m (transform 56ms, setup 0ms, import 71ms, tests 3ms, environment 526ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-wts9eh1v/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:58
[2m   Duration [22m 650ms[2m (transform 35ms, setup 0ms, import 48ms, tests 2ms, environment 503ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-wts9eh1v/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:59
[2m   Duration [22m 683ms[2m (transform 46ms, setup 0ms, import 58ms, tests 2ms, environment 479ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 8s

> healthbridge-monorepo@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-wg4_s2x0/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:00
[2m   Duration [22m 630ms[2m (transform 33ms, setup 0ms, import 45ms, tests 2ms, environment 476ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-wg4_s2x0/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:01
[2m   Duration [22m 575ms[2m (transform 43ms, setup 0ms, import 53ms, tests 2ms, environment 420ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-wg4_s2x0/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:02
[2m   Duration [22m 466ms[2m (transform 27ms, setup 0ms, import 35ms, tests 2ms, environment 325ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-wg4_s2x0/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:02
[2m   Duration [22m 504ms[2m (transform 35ms, setup 0ms, import 46ms, tests 2ms, environment 370ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-wg4_s2x0/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:59:03
[2m   Duration [22m 529ms[2m (transform 43ms, setup 0ms, import 55ms, tests 2ms, environment 390ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml, pyproject.toml
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
<summary>healthcare-integration-platform__xh5bL3E: FAIL, score 0.875, criteria 19/20</summary>

- Task: `healthcare-integration-platform__0cca2340f9ad`
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
hidden reference tests: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 25s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-c890b1mq/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:20
[2m   Duration [22m 745ms[2m (transform 47ms, setup 0ms, import 61ms, tests 2ms, environment 574ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-c890b1mq/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:21
[2m   Duration [22m 539ms[2m (transform 39ms, setup 0ms, import 52ms, tests 2ms, environment 391ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-c890b1mq/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:22
[2m   Duration [22m 499ms[2m (transform 32ms, setup 0ms, import 41ms, tests 2ms, environment 358ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-c890b1mq/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:23
[2m   Duration [22m 545ms[2m (transform 30ms, setup 0ms, import 41ms, tests 2ms, environment 411ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-hidden-tests-c890b1mq/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:57:24
[2m   Duration [22m 513ms[2m (transform 34ms, setup 0ms, import 44ms, tests 3ms, environment 360ms)[22m


STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 1
STDOUT:

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `test -f package-lock.json && npm install --package-lock=false --no-audit --fund=false && npm test` exited 0
STDOUT:

added 143 packages in 5s

> healthbridge@0.1.0 test
> npm run test --workspaces --if-present


> healthbridge-admin-dashboard@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fr4u_1s1/repo/apps/admin-dashboard[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:12
[2m   Duration [22m 615ms[2m (transform 31ms, setup 0ms, import 42ms, tests 2ms, environment 466ms)[22m


> healthbridge-integration-console@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fr4u_1s1/repo/apps/integration-console[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:13
[2m   Duration [22m 493ms[2m (transform 28ms, setup 0ms, import 38ms, tests 1ms, environment 349ms)[22m


> healthbridge-patient-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fr4u_1s1/repo/apps/patient-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:13
[2m   Duration [22m 575ms[2m (transform 30ms, setup 0ms, import 40ms, tests 7ms, environment 425ms)[22m


> healthbridge-provider-portal@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fr4u_1s1/repo/apps/provider-portal[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:14
[2m   Duration [22m 474ms[2m (transform 40ms, setup 0ms, import 50ms, tests 2ms, environment 345ms)[22m


> healthbridge-public-website@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.9 [39m[90m/tmp/frontiercode-visible-tests-fr4u_1s1/repo/apps/public-website[39m

 [32m✓[39m src/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 1[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 23:58:15
[2m   Duration [22m 484ms[2m (transform 40ms, setup 0ms, import 51ms, tests 1ms, environment 346ms)[22m


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .github/workflows/verify.yml, pyproject.toml
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

