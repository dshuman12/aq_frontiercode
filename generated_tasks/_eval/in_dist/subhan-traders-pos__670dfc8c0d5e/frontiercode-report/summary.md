# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.350 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | 5 | 0.000 | 0.350 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | subhan-traders-pos__670dfc8c0d5e__7HWjXw4 | no | 3/5 | patch_specific 1/2, regular 2/3 | 0.350 | hidden_reference_tests_pass, scope_matches_reference_intent |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | subhan-traders-pos__670dfc8c0d5e__V84ZymQ | no | 3/5 | patch_specific 1/2, regular 2/3 | 0.350 | hidden_reference_tests_pass, scope_matches_reference_intent |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | subhan-traders-pos__670dfc8c0d5e__nV92iHz | no | 3/5 | patch_specific 1/2, regular 2/3 | 0.350 | hidden_reference_tests_pass, scope_matches_reference_intent |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | subhan-traders-pos__670dfc8c0d5e__niGGbKd | no | 3/5 | patch_specific 1/2, regular 2/3 | 0.350 | hidden_reference_tests_pass, scope_matches_reference_intent |
| subhan-traders-pos__670dfc8c0d5e | codex | openai/gpt-5.5 | high | subhan-traders-pos__670dfc8c0d5e__q3LFFLx | no | 3/5 | patch_specific 1/2, regular 2/3 | 0.350 | hidden_reference_tests_pass, scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>subhan-traders-pos__670dfc8c0d5e__7HWjXw4: FAIL, score 0.350, criteria 3/5</summary>

- Task: `subhan-traders-pos__670dfc8c0d5e`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 1/2, regular 2/3
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| api_client_quality | patch_specific | llm_prompt | no | 0.100 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
Customer pagination/search hidden checks failed:
- Outstanding-only filter must require a positive outstanding amount
- Cursor filtering must advance past the last customer name
- Customer pages must be ordered consistently by customer name
- Customer data query must limit results to PAGE_SIZE
- Customer route must compute a total count for the active search/filter set
- nextCursor must be present only when a full page is returned
- Customer route must return an object with data, nextCursor, and total
- CustomersClient must track online state and paginated list state; missing: isFetchingMore
- CustomersClient should not use the old one-shot offline-data customer fetcher
- Next-page fetches must send the current nextCursor
- First-page fetch must replace the customer list with mapped API data
- Next-page fetch must append new mapped customers to existing rows
- Search/filter changes must reset the customer list before reloading
- Client must store the API nextCursor after each fetch
- Client must stop fetching when the API reports no next cursor
- Next-page fetch must guard against duplicate or exhausted requests
- Client must expose search input and outstanding filter controls; missing: Filter
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` exited 0
STDOUT:

> subhan-traders-pos@0.1.0 lint
> eslint src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `api_client_quality` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>subhan-traders-pos__670dfc8c0d5e__V84ZymQ: FAIL, score 0.350, criteria 3/5</summary>

- Task: `subhan-traders-pos__670dfc8c0d5e`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 1/2, regular 2/3
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| api_client_quality | patch_specific | llm_prompt | no | 0.100 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
Customer pagination/search hidden checks failed:
- Cursor filtering must advance past the last customer name
- Customer pages must be ordered consistently by customer name
- Customer data query must limit results to PAGE_SIZE
- Customer route must compute a total count for the active search/filter set
- nextCursor must be present only when a full page is returned
- Customer route must return an object with data, nextCursor, and total
- CustomersClient must track online state and paginated list state; missing: hasMore, isFetchingMore
- CustomersClient should not use the old one-shot offline-data customer fetcher
- Next-page fetches must send the current nextCursor
- First-page fetch must replace the customer list with mapped API data
- Next-page fetch must append new mapped customers to existing rows
- Search/filter changes must reset the customer list before reloading
- Client must store the API nextCursor after each fetch
- Client must stop fetching when the API reports no next cursor
- Next-page fetch must guard against duplicate or exhausted requests
- Client must expose search input and outstanding filter controls; missing: Filter
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` exited 0
STDOUT:

> subhan-traders-pos@0.1.0 lint
> eslint src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `api_client_quality` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>subhan-traders-pos__670dfc8c0d5e__nV92iHz: FAIL, score 0.350, criteria 3/5</summary>

- Task: `subhan-traders-pos__670dfc8c0d5e`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 1/2, regular 2/3
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| api_client_quality | patch_specific | llm_prompt | no | 0.100 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
Customer pagination/search hidden checks failed:
- Cursor filtering must advance past the last customer name
- Customer pages must be ordered consistently by customer name
- Customer data query must limit results to PAGE_SIZE
- Customer route must compute a total count for the active search/filter set
- nextCursor must be present only when a full page is returned
- Customer route must return an object with data, nextCursor, and total
- CustomersClient must track online state and paginated list state; missing: isFetchingMore
- Next-page fetches must send the current nextCursor
- First-page fetch must replace the customer list with mapped API data
- Next-page fetch must append new mapped customers to existing rows
- Search/filter changes must reset the customer list before reloading
- Client must store the API nextCursor after each fetch
- Client must stop fetching when the API reports no next cursor
- Next-page fetch must guard against duplicate or exhausted requests
- Client must expose search input and outstanding filter controls; missing: Filter
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` exited 0
STDOUT:

> subhan-traders-pos@0.1.0 lint
> eslint src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `api_client_quality` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>subhan-traders-pos__670dfc8c0d5e__niGGbKd: FAIL, score 0.350, criteria 3/5</summary>

- Task: `subhan-traders-pos__670dfc8c0d5e`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 1/2, regular 2/3
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| api_client_quality | patch_specific | llm_prompt | no | 0.100 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
Customer pagination/search hidden checks failed:
- Customer route must define a reusable PAGE_SIZE for paginated requests
- Cursor filtering must advance past the last customer name
- Customer pages must be ordered consistently by customer name
- Customer data query must limit results to PAGE_SIZE
- nextCursor must be present only when a full page is returned
- Customer route must return an object with data, nextCursor, and total
- CustomersClient must track online state and paginated list state; missing: isFetchingMore
- CustomersClient should not use the old one-shot offline-data customer fetcher
- Next-page fetches must send the current nextCursor
- First-page fetch must replace the customer list with mapped API data
- Next-page fetch must append new mapped customers to existing rows
- Search/filter changes must reset the customer list before reloading
- Client must store the API nextCursor after each fetch
- Client must stop fetching when the API reports no next cursor
- Next-page fetch must guard against duplicate or exhausted requests
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` exited 0
STDOUT:

> subhan-traders-pos@0.1.0 lint
> eslint src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json, tsconfig.tsbuildinfo
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `api_client_quality` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>subhan-traders-pos__670dfc8c0d5e__q3LFFLx: FAIL, score 0.350, criteria 3/5</summary>

- Task: `subhan-traders-pos__670dfc8c0d5e`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.350
- Reward: 0.000
- Criteria: 3/5
- Categories: patch_specific 1/2, regular 2/3
- Blocker failures: `hidden_reference_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.450 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.200 | 1.000 | yes |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| api_client_quality | patch_specific | llm_prompt | no | 0.100 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
Customer pagination/search hidden checks failed:
- Outstanding-only filter must require a positive outstanding amount
- Cursor filtering must advance past the last customer name
- Customer pages must be ordered consistently by customer name
- Customer data query must limit results to PAGE_SIZE
- Customer route must compute a total count for the active search/filter set
- nextCursor must be present only when a full page is returned
- Customer route must return an object with data, nextCursor, and total
- CustomersClient must track online state and paginated list state; missing: hasMore, isFetchingMore
- Next-page fetches must send the current nextCursor
- First-page fetch must replace the customer list with mapped API data
- Next-page fetch must append new mapped customers to existing rows
- Search/filter changes must reset the customer list before reloading
- Client must store the API nextCursor after each fetch
- Client must stop fetching when the API reports no next cursor
- Next-page fetch must guard against duplicate or exhausted requests
- Client must expose search input and outstanding filter controls; missing: Filter
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `npm run lint -- src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx` exited 0
STDOUT:

> subhan-traders-pos@0.1.0 lint
> eslint src/app/api/customers/route.ts src/components/customers/CustomersClient.tsx


STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: package-lock.json, tsconfig.tsbuildinfo
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `api_client_quality` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

