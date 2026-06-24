# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 4
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | 4 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | 4 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | drift__binop-associativity__8Xjy5bM | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | drift__binop-associativity__LKWrLQo | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | drift__binop-associativity__Sapn2ah | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |
| drift__binop-associativity | codex | openai/gpt-5.5 | high | drift__binop-associativity__YjCDBbj | no | 19/20 | patch_specific 6/6, regular 13/14 | 0.000 | scope_matches_reference_intent |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>drift__binop-associativity__8Xjy5bM: FAIL, score 0.000, criteria 19/20</summary>

- Task: `drift__binop-associativity`
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
hidden reference tests: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.008s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/parser/...` exited 1
STDOUT:
--- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative (0.00s)
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/term_subtraction (0.00s)
        parser_test.go:139: expected binary expression with op -, got *ast.Ident
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/term_mixed_addition_subtraction (0.00s)
        parser_test.go:138: expected binary op -, got +
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/factor_division (0.00s)
        parser_test.go:138: expected binary op /, got *
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/factor_modulo (0.00s)
        parser_test.go:138: expected binary op %, got /
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/comparison (0.00s)
        parser_test.go:138: expected binary op <=, got <
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/equality (0.00s)
        parser_test.go:138: expected binary op !=, got ==
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/logical_and (0.00s)
        parser_test.go:139: expected binary expression with op &&, got *ast.Ident
    --- FAIL: TestBinaryExprEqualPrecedenceChainsAreLeftAssociative/logical_or (0.00s)
        parser_test.go:139: expected binary expression with op ||, got *ast.Ident
FAIL
FAIL	github.com/Mustafa4ngin/Drift/pkg/parser	0.003s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.038s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/drift/main.go, integration/bench_test.go, integration/integration_test.go, pkg/ast/ast.go, pkg/ast/ast_test.go, pkg/checker/checker.go, pkg/checker/checker_test.go, pkg/environ/environ.go, pkg/environ/environ_test.go, pkg/errors/errors.go, pkg/errors/errors_test.go, pkg/evaluator/binops.go, pkg/evaluator/evaluator.go, pkg/evaluator/evaluator_test.go, pkg/lexer/lexer.go, pkg/lexer/lexer_test.go, pkg/object/object.go, pkg/object/object_test.go, pkg/repl/repl.go, pkg/repl/repl_test.go
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
<summary>drift__binop-associativity__LKWrLQo: FAIL, score 0.000, criteria 19/20</summary>

- Task: `drift__binop-associativity`
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
hidden reference tests: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.008s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/parser/...` exited 1
STDOUT:
--- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft (0.00s)
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/subtraction (0.00s)
        parser_test.go:64: got *ast.BinaryExpr, want *ast.Ident
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/addition_and_subtraction (0.00s)
        parser_test.go:64: got operator +, want -
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/factor_operators (0.00s)
        parser_test.go:64: got operator *, want %
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/comparison_operators (0.00s)
        parser_test.go:64: got operator <, want <=
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/equality_operators (0.00s)
        parser_test.go:64: got operator ==, want !=
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/logical_and_operators (0.00s)
        parser_test.go:64: got *ast.BinaryExpr, want *ast.Ident
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/logical_or_operators (0.00s)
        parser_test.go:64: got *ast.BinaryExpr, want *ast.Ident
FAIL
FAIL	github.com/Mustafa4ngin/Drift/pkg/parser	0.011s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.090s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/drift/main.go, integration/bench_test.go, integration/integration_test.go, pkg/ast/ast.go, pkg/ast/ast_test.go, pkg/checker/checker.go, pkg/checker/checker_test.go, pkg/environ/environ.go, pkg/environ/environ_test.go, pkg/errors/errors.go, pkg/errors/errors_test.go, pkg/evaluator/binops.go, pkg/evaluator/evaluator.go, pkg/evaluator/evaluator_test.go, pkg/lexer/lexer.go, pkg/lexer/lexer_test.go, pkg/object/object.go, pkg/object/object_test.go, pkg/repl/repl.go, pkg/repl/repl_test.go
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
<summary>drift__binop-associativity__Sapn2ah: FAIL, score 0.000, criteria 19/20</summary>

- Task: `drift__binop-associativity`
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
hidden reference tests: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.005s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/parser/...` exited 1
STDOUT:
--- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative (0.00s)
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/term_minus (0.00s)
        parser_test.go:64: expected identifier "c", got *ast.BinaryExpr
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/term_mixed_plus_minus (0.00s)
        parser_test.go:64: expected binary op -, got +
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/factor_mixed_multiply_divide_modulo (0.00s)
        parser_test.go:64: expected binary op %, got *
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/comparison_mixed (0.00s)
        parser_test.go:64: expected binary op <=, got <
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/equality_mixed (0.00s)
        parser_test.go:64: expected binary op !=, got ==
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/logical_and (0.00s)
        parser_test.go:64: expected identifier "c", got *ast.BinaryExpr
    --- FAIL: TestBinaryEqualPrecedenceChainsAreLeftAssociative/logical_or (0.00s)
        parser_test.go:64: expected identifier "c", got *ast.BinaryExpr
--- FAIL: TestBinaryMixedPrecedenceShape (0.00s)
    parser_test.go:91: expected binary op -, got +
FAIL
FAIL	github.com/Mustafa4ngin/Drift/pkg/parser	0.006s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.009s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/drift/main.go, integration/bench_test.go, integration/integration_test.go, pkg/ast/ast.go, pkg/ast/ast_test.go, pkg/checker/checker.go, pkg/checker/checker_test.go, pkg/environ/environ.go, pkg/environ/environ_test.go, pkg/errors/errors.go, pkg/errors/errors_test.go, pkg/evaluator/binops.go, pkg/evaluator/evaluator.go, pkg/evaluator/evaluator_test.go, pkg/lexer/lexer.go, pkg/lexer/lexer_test.go, pkg/object/object.go, pkg/object/object_test.go, pkg/repl/repl.go, pkg/repl/repl_test.go
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
<summary>drift__binop-associativity__YjCDBbj: FAIL, score 0.000, criteria 19/20</summary>

- Task: `drift__binop-associativity`
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
hidden reference tests: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.015s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `go test ./pkg/parser/...` exited 1
STDOUT:
--- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft (0.00s)
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/term_same_operator (0.00s)
        parser_test.go:141: expected BinaryExpr with op -, got *ast.Ident
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/term_mixed_operators (0.00s)
        parser_test.go:141: expected op -, got +
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/factor_mixed_operators (0.00s)
        parser_test.go:141: expected op %, got *
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/comparison_operators (0.00s)
        parser_test.go:141: expected op <=, got <
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/equality_operators (0.00s)
        parser_test.go:141: expected op !=, got ==
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/logical_and_operators (0.00s)
        parser_test.go:141: expected BinaryExpr with op &&, got *ast.Ident
    --- FAIL: TestBinaryExpressionsGroupEqualPrecedenceLeft/logical_or_operators (0.00s)
        parser_test.go:141: expected BinaryExpr with op ||, got *ast.Ident
--- FAIL: TestBinaryExpressionPrecedenceRegressionCases (0.00s)
    --- FAIL: TestBinaryExpressionPrecedenceRegressionCases/mixed_precedence (0.00s)
        parser_test.go:187: expected op -, got +
FAIL
FAIL	github.com/Mustafa4ngin/Drift/pkg/parser	0.029s
FAIL

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `go test ./pkg/parser/...` exited 0
STDOUT:
ok  	github.com/Mustafa4ngin/Drift/pkg/parser	0.006s

STDERR:
```

#### `scope_matches_reference_intent` (FAIL, score 0.000)

```text
Unexpected changed files: cmd/drift/main.go, integration/bench_test.go, integration/integration_test.go, pkg/ast/ast.go, pkg/ast/ast_test.go, pkg/checker/checker.go, pkg/checker/checker_test.go, pkg/environ/environ.go, pkg/environ/environ_test.go, pkg/errors/errors.go, pkg/errors/errors_test.go, pkg/evaluator/binops.go, pkg/evaluator/evaluator.go, pkg/evaluator/evaluator_test.go, pkg/lexer/lexer.go, pkg/lexer/lexer_test.go, pkg/object/object.go, pkg/object/object_test.go, pkg/repl/repl.go, pkg/repl/repl_test.go
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

