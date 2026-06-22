# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 10
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | 10 | 0.000 | 0.227 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | 10 | 0.000 | 0.227 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__N7GK5mh | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__UNM42kd | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__XEaJpDC | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__Z273b9E | no | 8/10 | patch_specific 4/4, regular 4/6 | 0.545 | visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__g7D9JLc | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__hLNtQyH | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__kCv8CtB | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__mQPpKjA | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__qdPck75 | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |
| preplane__bd5ac18268ad | codex | openai/gpt-5.5 | high | preplane__bd5ac18268ad__rpKpNiX | no | 7/10 | patch_specific 3/4, regular 4/6 | 0.192 | hidden_reference_tests_pass, visible_regression_tests_pass, scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>preplane__bd5ac18268ad__N7GK5mh: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: submission payload must include the target definition
    at has (file:///tmp/frontiercode-hidden-tests-rfpjojte/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-rfpjojte/repo/tests/aiFeedbackContract.test.mjs:79:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json, .next/next-minimal-server.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__UNM42kd: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: invalid or missing tasks must return a 400 response
    at has (file:///tmp/frontiercode-hidden-tests-wo2j3rr7/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-wo2j3rr7/repo/tests/aiFeedbackContract.test.mjs:45:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json, .next/next-minimal-server.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__XEaJpDC: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: component must keep a local fallback evaluator for failed AI requests
    at has (file:///tmp/frontiercode-hidden-tests-f28vnfkc/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-f28vnfkc/repo/tests/aiFeedbackContract.test.mjs:104:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/cache/config.json, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/package.json, .next/server/app-paths-manifest.json, .next/server/app/_not-found/page.js, .next/server/app/_not-found/page.js.nft.json, .next/server/app/api/chat/route.js, .next/server/app/api/chat/route.js.nft.json, .next/server/app/api/get-questions/route.js, .next/server/app/api/get-questions/route.js.nft.json, .next/server/app/api/question/[questionId]/route.js, .next/server/app/api/question/[questionId]/route.js.nft.json, .next/server/app/api/route.js, .next/server/app/api/route.js.nft.json, .next/server/app/dashboard/answered/page.js, .next/server/app/dashboard/answered/page.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__Z273b9E: FAIL, score 0.545, criteria 8/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.545
- Reward: 0.000
- Criteria: 8/10
- Categories: patch_specific 4/4, regular 4/6
- Blocker failures: `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 1.000 | yes |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (PASS, score 1.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 0
STDOUT:
AI feedback contract checks passed

STDERR:
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json, .next/next-minimal-server.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__g7D9JLc: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: submission payload must include the target definition
    at has (file:///tmp/frontiercode-hidden-tests-yisny3xt/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-yisny3xt/repo/tests/aiFeedbackContract.test.mjs:79:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/eslint/.cache_1ymtasf, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__hLNtQyH: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: invalid or missing tasks must return a 400 response
    at has (file:///tmp/frontiercode-hidden-tests-juizlg2t/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-juizlg2t/repo/tests/aiFeedbackContract.test.mjs:45:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/cache/config.json, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/package.json, .next/server/app-paths-manifest.json, .next/server/app/_not-found/page.js, .next/server/app/_not-found/page.js.nft.json, .next/server/app/api/chat/route.js, .next/server/app/api/chat/route.js.nft.json, .next/server/app/api/get-questions/route.js, .next/server/app/api/get-questions/route.js.nft.json, .next/server/app/api/question/[questionId]/route.js, .next/server/app/api/question/[questionId]/route.js.nft.json, .next/server/app/api/route.js, .next/server/app/api/route.js.nft.json, .next/server/app/dashboard/answered/page.js, .next/server/app/dashboard/answered/page.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__kCv8CtB: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: invalid or missing tasks must return a 400 response
    at has (file:///tmp/frontiercode-hidden-tests-3cz98z6o/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-3cz98z6o/repo/tests/aiFeedbackContract.test.mjs:45:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/cache/config.json, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/package.json, .next/server/app-paths-manifest.json, .next/server/app/_not-found/page.js, .next/server/app/_not-found/page.js.nft.json, .next/server/app/api/chat/route.js, .next/server/app/api/chat/route.js.nft.json, .next/server/app/api/get-questions/route.js, .next/server/app/api/get-questions/route.js.nft.json, .next/server/app/api/question/[questionId]/route.js, .next/server/app/api/question/[questionId]/route.js.nft.json, .next/server/app/api/route.js, .next/server/app/api/route.js.nft.json, .next/server/app/dashboard/answered/page.js, .next/server/app/dashboard/answered/page.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__mQPpKjA: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: invalid or missing tasks must return a 400 response
    at has (file:///tmp/frontiercode-hidden-tests-w9qzg6uz/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-w9qzg6uz/repo/tests/aiFeedbackContract.test.mjs:45:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json, .next/next-minimal-server.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__qdPck75: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: submission payload must include the target definition
    at has (file:///tmp/frontiercode-hidden-tests-oaaklw_5/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-oaaklw_5/repo/tests/aiFeedbackContract.test.mjs:79:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/cache/config.json, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/package.json, .next/server/app-paths-manifest.json, .next/server/app/_not-found/page.js, .next/server/app/_not-found/page.js.nft.json, .next/server/app/api/chat/route.js, .next/server/app/api/chat/route.js.nft.json, .next/server/app/api/get-questions/route.js, .next/server/app/api/get-questions/route.js.nft.json, .next/server/app/api/question/[questionId]/route.js, .next/server/app/api/question/[questionId]/route.js.nft.json, .next/server/app/api/route.js, .next/server/app/api/route.js.nft.json, .next/server/app/dashboard/answered/page.js, .next/server/app/dashboard/answered/page.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

<details>
<summary>preplane__bd5ac18268ad__rpKpNiX: FAIL, score 0.192, criteria 7/10</summary>

- Task: `preplane__bd5ac18268ad`
- Agent: `codex`
- Model: `openai/gpt-5.5`
- Reasoning effort: `high`
- Pass: no
- Score: 0.192
- Reward: 0.000
- Criteria: 7/10
- Categories: patch_specific 3/4, regular 4/6
- Blocker failures: `hidden_reference_tests_pass`, `visible_regression_tests_pass`, `scope_matches_reference_intent`

| Criterion | Category | Method | Blocker | Weight | Score | Pass |
| --- | --- | --- | --- | ---: | ---: | --- |
| hidden_reference_tests_pass | patch_specific | classical | yes | 0.350 | 0.000 | no |
| visible_regression_tests_pass | regular | command | yes | 0.250 | 0.000 | no |
| scope_matches_reference_intent | regular | scope | yes | 0.200 | 0.000 | no |
| no_hidden_asset_leak | regular | command | yes | 0.050 | 1.000 | yes |
| behavior_core_requirement | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| api_contract_and_secret_handling | patch_specific | llm_prompt | no | 0.030 | 1.000 | yes |
| client_error_handling | patch_specific | llm_prompt | no | 0.020 | 1.000 | yes |
| backward_compatibility | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| scope_minimal_patch | regular | llm_prompt | no | 0.020 | 1.000 | yes |
| maintainability_idiomatic_design | regular | llm_prompt | no | 0.020 | 1.000 | yes |

Criterion evidence:

#### `hidden_reference_tests_pass` (FAIL, score 0.000)

```text
hidden reference tests: `node tests/aiFeedbackContract.test.mjs` exited 1
STDOUT:

STDERR:
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: invalid or missing tasks must return a 400 response
    at has (file:///tmp/frontiercode-hidden-tests-nztvn1vo/repo/tests/aiFeedbackContract.test.mjs:16:10)
    at file:///tmp/frontiercode-hidden-tests-nztvn1vo/repo/tests/aiFeedbackContract.test.mjs:45:1
    at ModuleJob.run (node:internal/modules/esm/module_job:325:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:606:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}

Node.js v20.20.2
```

#### `visible_regression_tests_pass` (FAIL, score 0.000)

```text
visible regression command: `npm run build` exited 127
STDOUT:

> preplane@0.1.0 build
> next build


STDERR:
sh: 1: next: not found
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: .next/BUILD_ID, .next/app-build-manifest.json, .next/app-path-routes-manifest.json, .next/build-manifest.json, .next/cache/.tsbuildinfo, .next/cache/config.json, .next/cache/webpack/client-production/0.pack, .next/cache/webpack/client-production/index.pack, .next/cache/webpack/client-production/index.pack.old, .next/cache/webpack/edge-server-production/0.pack, .next/cache/webpack/edge-server-production/index.pack, .next/cache/webpack/edge-server-production/index.pack.old, .next/cache/webpack/server-production/0.pack, .next/cache/webpack/server-production/index.pack, .next/cache/webpack/server-production/index.pack.old, .next/diagnostics/build-diagnostics.json, .next/diagnostics/framework.json, .next/export-marker.json, .next/images-manifest.json, .next/next-minimal-server.js.nft.json
```

#### `no_hidden_asset_leak` (PASS, score 1.000)

```text
No generated hidden asset names or fix commit identifiers were found in the agent-visible repo.
```

#### `behavior_core_requirement` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `api_contract_and_secret_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `client_error_handling` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `backward_compatibility` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `scope_minimal_patch` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```

#### `maintainability_idiomatic_design` (PASS, score 1.000)

```text
Advisory LLM rubric item recorded by the deterministic verifier; run task QA with LLM review for semantic scoring.
```


</details>

