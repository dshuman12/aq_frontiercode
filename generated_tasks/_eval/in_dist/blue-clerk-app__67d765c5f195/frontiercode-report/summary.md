# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.310 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.310 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | blue-clerk-app__67d765c5f195__K6qAzit | no | 6/10 | patch_specific 2/5, regular 4/5 | 0.250 | create_job_address_contract, update_job_address_contract, job_site_route_contract, scope_matches_reference_intent |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | blue-clerk-app__67d765c5f195__iyLie3u | no | 6/10 | patch_specific 2/5, regular 4/5 | 0.250 | create_job_address_contract, update_job_address_contract, job_site_route_contract, scope_matches_reference_intent |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | blue-clerk-app__67d765c5f195__oBDnRtY | no | 7/10 | patch_specific 3/5, regular 4/5 | 0.350 | create_job_address_contract, update_job_address_contract, scope_matches_reference_intent |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | blue-clerk-app__67d765c5f195__pDM4BdU | no | 7/10 | patch_specific 3/5, regular 4/5 | 0.350 | create_job_address_contract, update_job_address_contract, scope_matches_reference_intent |
| blue-clerk-app__67d765c5f195 | codex | openai/gpt-5.5 | high | blue-clerk-app__67d765c5f195__xGkbhQ8 | no | 7/10 | patch_specific 3/5, regular 4/5 | 0.350 | create_job_address_contract, update_job_address_contract, scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>blue-clerk-app__67d765c5f195__K6qAzit: FAIL, score 0.250, criteria 6/10</summary>

- Task: `blue-clerk-app__67d765c5f195`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.250
- Reward: 0.000
- Criteria: 6/10
- Categories: patch_specific 2/5, regular 4/5
- Blocker failures: `create_job_address_contract`, `update_job_address_contract`, `job_site_route_contract`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| create_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| update_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| job_site_route_contract | patch_specific | command | yes | 0.100 | 0.000 | no |
| submitted_job_site_tests_present | regular | command | yes | 0.100 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| regression_tests_meaningful | regular | llm_prompt | no | 0.025 | 1.000 | yes |
| maintainability_scope | regular | llm_prompt | no | 0.025 | 1.000 | yes |

Criterion evidence:

#### `create_job_address_contract` (FAIL, score 0.000)

```text
create job address contract failed: allows address-only create; rejects duplicate name within subdivision
```

#### `update_job_address_contract` (FAIL, score 0.000)

```text
update job address contract failed: checks duplicate only when name changes; duplicate check is scoped to subdivision; preserves address when omitted; preserves customer owner; preserves or updates homeowner; reports no-op updates
```

#### `job_site_route_contract` (FAIL, score 0.000)

```text
job site route contract failed: name search route removed
```

#### `submitted_job_site_tests_present` (PASS, score 1.000)

```text
submitted jobSite controller tests satisfied 5 static checks.
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
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

#### `regression_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_scope` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>blue-clerk-app__67d765c5f195__iyLie3u: FAIL, score 0.250, criteria 6/10</summary>

- Task: `blue-clerk-app__67d765c5f195`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.250
- Reward: 0.000
- Criteria: 6/10
- Categories: patch_specific 2/5, regular 4/5
- Blocker failures: `create_job_address_contract`, `update_job_address_contract`, `job_site_route_contract`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| create_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| update_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| job_site_route_contract | patch_specific | command | yes | 0.100 | 0.000 | no |
| submitted_job_site_tests_present | regular | command | yes | 0.100 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| regression_tests_meaningful | regular | llm_prompt | no | 0.025 | 1.000 | yes |
| maintainability_scope | regular | llm_prompt | no | 0.025 | 1.000 | yes |

Criterion evidence:

#### `create_job_address_contract` (FAIL, score 0.000)

```text
create job address contract failed: rejects duplicate name within subdivision
```

#### `update_job_address_contract` (FAIL, score 0.000)

```text
update job address contract failed: checks duplicate only when name changes; duplicate check is scoped to subdivision; preserves address when omitted; preserves location when omitted; preserves customer owner; preserves or updates homeowner; reports no-op updates
```

#### `job_site_route_contract` (FAIL, score 0.000)

```text
job site route contract failed: name search route removed
```

#### `submitted_job_site_tests_present` (PASS, score 1.000)

```text
submitted jobSite controller tests satisfied 5 static checks.
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
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

#### `regression_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_scope` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>blue-clerk-app__67d765c5f195__oBDnRtY: FAIL, score 0.350, criteria 7/10</summary>

- Task: `blue-clerk-app__67d765c5f195`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/5, regular 4/5
- Blocker failures: `create_job_address_contract`, `update_job_address_contract`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| create_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| update_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| job_site_route_contract | patch_specific | command | yes | 0.100 | 1.000 | yes |
| submitted_job_site_tests_present | regular | command | yes | 0.100 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| regression_tests_meaningful | regular | llm_prompt | no | 0.025 | 1.000 | yes |
| maintainability_scope | regular | llm_prompt | no | 0.025 | 1.000 | yes |

Criterion evidence:

#### `create_job_address_contract` (FAIL, score 0.000)

```text
create job address contract failed: loads subdivision by locationId; rejects duplicate name within subdivision
```

#### `update_job_address_contract` (FAIL, score 0.000)

```text
update job address contract failed: checks duplicate only when name changes; duplicate check is scoped to subdivision; preserves address when omitted; preserves customer owner; preserves or updates homeowner; reports no-op updates
```

#### `job_site_route_contract` (PASS, score 1.000)

```text
job site route contract satisfied 4 static checks.
```

#### `submitted_job_site_tests_present` (PASS, score 1.000)

```text
submitted jobSite controller tests satisfied 5 static checks.
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
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

#### `regression_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_scope` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>blue-clerk-app__67d765c5f195__pDM4BdU: FAIL, score 0.350, criteria 7/10</summary>

- Task: `blue-clerk-app__67d765c5f195`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/5, regular 4/5
- Blocker failures: `create_job_address_contract`, `update_job_address_contract`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| create_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| update_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| job_site_route_contract | patch_specific | command | yes | 0.100 | 1.000 | yes |
| submitted_job_site_tests_present | regular | command | yes | 0.100 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| regression_tests_meaningful | regular | llm_prompt | no | 0.025 | 1.000 | yes |
| maintainability_scope | regular | llm_prompt | no | 0.025 | 1.000 | yes |

Criterion evidence:

#### `create_job_address_contract` (FAIL, score 0.000)

```text
create job address contract failed: rejects duplicate name within subdivision
```

#### `update_job_address_contract` (FAIL, score 0.000)

```text
update job address contract failed: checks duplicate only when name changes; duplicate check is scoped to subdivision; preserves address when omitted; preserves location when omitted; preserves customer owner; preserves or updates homeowner; reports no-op updates
```

#### `job_site_route_contract` (PASS, score 1.000)

```text
job site route contract satisfied 4 static checks.
```

#### `submitted_job_site_tests_present` (PASS, score 1.000)

```text
submitted jobSite controller tests satisfied 5 static checks.
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
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

#### `regression_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_scope` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>blue-clerk-app__67d765c5f195__xGkbhQ8: FAIL, score 0.350, criteria 7/10</summary>

- Task: `blue-clerk-app__67d765c5f195`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/5, regular 4/5
- Blocker failures: `create_job_address_contract`, `update_job_address_contract`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| create_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| update_job_address_contract | patch_specific | command | yes | 0.250 | 0.000 | no |
| job_site_route_contract | patch_specific | command | yes | 0.100 | 1.000 | yes |
| submitted_job_site_tests_present | regular | command | yes | 0.100 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.150 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| behavior_edge_cases | patch_specific | llm_prompt | no | 0.025 | 1.000 | yes |
| regression_tests_meaningful | regular | llm_prompt | no | 0.025 | 1.000 | yes |
| maintainability_scope | regular | llm_prompt | no | 0.025 | 1.000 | yes |

Criterion evidence:

#### `create_job_address_contract` (FAIL, score 0.000)

```text
create job address contract failed: rejects duplicate name within subdivision
```

#### `update_job_address_contract` (FAIL, score 0.000)

```text
update job address contract failed: checks duplicate only when name changes; duplicate check is scoped to subdivision; preserves address when omitted; preserves location when omitted; preserves or updates homeowner; reports no-op updates
```

#### `job_site_route_contract` (PASS, score 1.000)

```text
job site route contract satisfied 4 static checks.
```

#### `submitted_job_site_tests_present` (PASS, score 1.000)

```text
submitted jobSite controller tests satisfied 5 static checks.
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
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

#### `regression_tests_meaningful` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_scope` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

