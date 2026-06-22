# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 2
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| meridian__88114e1 | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| meridian__88114e1 | codex | openai/gpt-5.5 | high | 2 | 0.000 | 0.000 | 0.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| meridian__88114e1 | codex | openai/gpt-5.5 | high | meridian__88114e1__2Da85AW | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base |
| meridian__88114e1 | codex | openai/gpt-5.5 | high | meridian__88114e1__HiVxN6W | no | 18/20 | patch_specific 5/6, regular 13/14 | 0.000 | hidden_reference_tests_pass, submitted_tests_fail_on_base |

## Grader Details

Trial score is zero when any blocker criterion fails; otherwise it is the weighted average of criterion scores.

<details>
<summary>meridian__88114e1__2Da85AW: FAIL, score 0.000, criteria 18/20</summary>

- Task: `meridian__88114e1`
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
hidden reference tests: `python -m pytest tests/ -x -q` exited 1
STDOUT:
...............F
=================================== FAILURES ===================================
____________________ test_path_graph_betweenness_normalized ____________________

    def test_path_graph_betweenness_normalized():
        # In a path graph 0-1-2-3-4, node 2 (middle) has highest betweenness
        # For n=5 path graph, the correct normalized betweenness of middle node is 0.6
        G = Graph()
        for i in range(5):
            G.add_node(i)
        for i in range(4):
            G.add_edge(i, i+1)
    
        bc = betweenness_centrality(G, normalized=True)
        # Node 2 (middle) betweenness in undirected path of 5: should be 0.6
>       assert abs(bc[2] - 0.6) < 1e-6, f"Expected 0.6, got {bc[2]}"
E       AssertionError: Expected 0.6, got 0.6666666666666666
E       assert 0.06666666666666665 < 1e-06
E        +  where 0.06666666666666665 = abs((0.6666666666666666 - 0.6))

tests/test_betweenness_fix.py:18: AssertionError
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-hidden-tests-9iqi63jm/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
FAILED tests/test_betweenness_fix.py::test_path_graph_betweenness_normalized - AssertionError: Expected 0.6, got 0.6666666666666666
assert 0.06666666666666665 < 1e-06
 +  where 0.06666666666666665 = abs((0.6666666666666666 - 0.6))
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
1 failed, 15 passed, 1 warning in 0.44s

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `python -m pytest tests/ -x -q` exited 0
STDOUT:
........................................................................ [ 16%]
........................................................................ [ 32%]
........................................................................ [ 49%]
........................................................................ [ 65%]
........................................................................ [ 81%]
........................................................................ [ 98%]
........                                                                 [100%]
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-reverse-classical-zt0bq6vk/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
440 passed, 1 warning in 0.76s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `python -m pytest tests/ -x -q` exited 0
STDOUT:
........................................................................ [ 16%]
........................................................................ [ 32%]
........................................................................ [ 49%]
........................................................................ [ 65%]
........................................................................ [ 81%]
........................................................................ [ 98%]
........                                                                 [100%]
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-visible-tests-c8xyf3hd/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
440 passed, 1 warning in 0.69s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: meridian/algorithms/centrality.py, tests/test_centrality.py
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
<summary>meridian__88114e1__HiVxN6W: FAIL, score 0.000, criteria 18/20</summary>

- Task: `meridian__88114e1`
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
hidden reference tests: `python -m pytest tests/ -x -q` exited 1
STDOUT:
...............F
=================================== FAILURES ===================================
____________________ test_path_graph_betweenness_normalized ____________________

    def test_path_graph_betweenness_normalized():
        # In a path graph 0-1-2-3-4, node 2 (middle) has highest betweenness
        # For n=5 path graph, the correct normalized betweenness of middle node is 0.6
        G = Graph()
        for i in range(5):
            G.add_node(i)
        for i in range(4):
            G.add_edge(i, i+1)
    
        bc = betweenness_centrality(G, normalized=True)
        # Node 2 (middle) betweenness in undirected path of 5: should be 0.6
>       assert abs(bc[2] - 0.6) < 1e-6, f"Expected 0.6, got {bc[2]}"
E       AssertionError: Expected 0.6, got 0.6666666666666666
E       assert 0.06666666666666665 < 1e-06
E        +  where 0.06666666666666665 = abs((0.6666666666666666 - 0.6))

tests/test_betweenness_fix.py:18: AssertionError
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-hidden-tests-oflt3wft/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
FAILED tests/test_betweenness_fix.py::test_path_graph_betweenness_normalized - AssertionError: Expected 0.6, got 0.6666666666666666
assert 0.06666666666666665 < 1e-06
 +  where 0.06666666666666665 = abs((0.6666666666666666 - 0.6))
!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!
1 failed, 15 passed, 1 warning in 0.30s

STDERR:
```

#### `submitted_tests_fail_on_base` (FAIL, score 0.000)

```text
Submitted tests unexpectedly passed on the broken base snapshot.
submitted tests on base snapshot: `python -m pytest tests/ -x -q` exited 0
STDOUT:
........................................................................ [ 16%]
........................................................................ [ 32%]
........................................................................ [ 49%]
........................................................................ [ 65%]
........................................................................ [ 81%]
........................................................................ [ 98%]
........                                                                 [100%]
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-reverse-classical-emrie40t/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
440 passed, 1 warning in 0.37s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `python -m pytest tests/ -x -q` exited 0
STDOUT:
........................................................................ [ 16%]
........................................................................ [ 32%]
........................................................................ [ 49%]
........................................................................ [ 65%]
........................................................................ [ 81%]
........................................................................ [ 98%]
........                                                                 [100%]
=============================== warnings summary ===============================
meridian/partition.py:323
  /tmp/frontiercode-visible-tests-i6vq3a2b/repo/meridian/partition.py:323: SyntaxWarning: invalid escape sequence '\A'
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
440 passed, 1 warning in 0.36s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: meridian/algorithms/centrality.py, tests/test_centrality.py
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

