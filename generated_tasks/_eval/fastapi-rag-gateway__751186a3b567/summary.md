# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__751186a3b56__YSPD5jL | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__751186a3b56__iJ3ZAxw | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__751186a3b56__jKjnP52 | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__751186a3b56__mRjxpEE | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__751186a3b567 | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__751186a3b56__nRmKStE | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>fastapi-rag-gateway__751186a3b56__YSPD5jL: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__751186a3b567`
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
hidden reference tests: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.05s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_pagination.py` exited 1
STDOUT:
F...F                                                                    [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_________ test_pagination_metadata_counts_reachable_pages[11-2-3-True] _________

total = 11, page = 2, expected_pages = 3, expected_has_next = True

    @pytest.mark.parametrize(
        ("total", "page", "expected_pages", "expected_has_next"),
        [
            (11, 2, 3, True),
            (10, 2, 2, False),
            (5, 1, 1, False),
            (0, 1, 1, False),
            (11, 3, 3, False),
        ],
    )
    def test_pagination_metadata_counts_reachable_pages(
        total: int,
        page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        result = paginate_in_memory(range(total), PageRequest(page=page, size=5)).to_dict()
    
>       assert result["pages"] == expected_pages
E       assert 2 == 3

tests/unit/test_pagination.py:28: AssertionError
________ test_pagination_metadata_counts_reachable_pages[11-3-3-False] _________

total = 11, page = 3, expected_pages = 3, expected_has_next = False

    @pytest.mark.parametrize(
        ("total", "page", "expected_pages", "expected_has_next"),
        [
            (11, 2, 3, True),
            (10, 2, 2, False),
            (5, 1, 1, False),
            (0, 1, 1, False),
            (11, 3, 3, False),
        ],
    )
    def test_pagination_metadata_counts_reachable_pages(
        total: int,
        page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        result = paginate_in_memory(range(total), PageRequest(page=page, size=5)).to_dict()
    
>       assert result["pages"] == expected_pages
E       assert 2 == 3

tests/unit/test_pagination.py:28: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_pagination.py::test_pagination_metadata_counts_reachable_pages[11-2-3-True] - assert 2 == 3
FAILED tests/unit/test_pagination.py::test_pagination_metadata_counts_reachable_pages[11-3-3-False] - assert 2 == 3
2 failed, 3 passed in 0.07s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
.....                                                                    [100%]Running teardown with pytest sessionfinish...

5 passed in 0.03s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/core/pagination.py, tests/unit/test_pagination.py
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
<summary>fastapi-rag-gateway__751186a3b56__iJ3ZAxw: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__751186a3b567`
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
hidden reference tests: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_pagination.py` exited 1
STDOUT:
F...F.                                                                   [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_____________ test_trailing_partial_page_is_counted_and_reachable ______________

    def test_trailing_partial_page_is_counted_and_reachable() -> None:
        page = paginate_in_memory(range(21), PageRequest(page=2, size=10))
    
>       assert page.to_dict() == {
            "items": list(range(10, 20)),
            "page": 2,
            "size": 10,
            "total": 21,
            "pages": 3,
            "sort": None,
            "direction": "asc",
            "has_next": True,
            "has_prev": True,
        }
E       AssertionError: assert {'direction':...15, ...], ...} == {'direction':...15, ...], ...}
E         
E         Omitting 7 identical items, use -vv to show
E         Differing items:
E         {'has_next': False} != {'has_next': True}
E         {'pages': 2} != {'pages': 3}
E         
E         Full diff:
E           {
E               'direction': 'asc',
E         -     'has_next': True,
E         ?                 ^^^
E         +     'has_next': False,
E         ?                 ^^^^
E               'has_prev': True,
E               'items': [
E                   10,
E                   11,
E                   12,
E                   13,
E                   14,
E                   15,
E                   16,
E                   17,
E                   18,
E                   19,
E               ],
E               'page': 2,
E         -     'pages': 3,
E         ?              ^
E         +     'pages': 2,
E         ?              ^
E               'size': 10,
E               'sort': None,
E               'total': 21,
E           }

tests/unit/test_pagination.py:7: AssertionError
___________________ test_last_partial_page_has_no_next_page ____________________

    def test_last_partial_page_has_no_next_page() -> None:
        page = paginate_in_memory(range(21), PageRequest(page=3, size=10))
    
>       assert page.pages == 3
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[20], total=21, page=3, size=10, sort=None, direction='asc').pages

tests/unit/test_pagination.py:48: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_pagination.py::test_trailing_partial_page_is_counted_and_reachable - AssertionError: assert {'direction':...15, ...], ...} == {'direction':...15, ...], ...}
  
  Omitting 7 identical items, use -vv to show
  Differing items:
  {'has_next': False} != {'has_next': True}
  {'pages': 2} != {'pages': 3}
  
  Full diff:
    {
        'direction': 'asc',
  -     'has_next': True,
  ?                 ^^^
  +     'has_next': False,
  ?                 ^^^^
        'has_prev': True,
        'items': [
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
        ],
        'page': 2,
  -     'pages': 3,
  ?              ^
  +     'pages': 2,
  ?              ^
        'size': 10,
        'sort': None,
        'total': 21,
    }
FAILED tests/unit/test_pagination.py::test_last_partial_page_has_no_next_page - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[20], total=21, page=3, size=10, sort=None, direction='asc').pages
2 failed, 4 passed in 0.07s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/core/pagination.py, tests/unit/test_pagination.py
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
<summary>fastapi-rag-gateway__751186a3b56__jKjnP52: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__751186a3b567`
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
hidden reference tests: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_pagination.py` exited 1
STDOUT:
FF...F                                                                   [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_______ test_pagination_metadata_counts_reachable_pages[26-25-1-2-True] ________

total = 26, size = 25, page = 1, expected_pages = 2, expected_has_next = True

    @pytest.mark.parametrize(
        ("total", "size", "page", "expected_pages", "expected_has_next"),
        [
            (26, 25, 1, 2, True),
            (26, 25, 2, 2, False),
            (50, 25, 2, 2, False),
            (1, 25, 1, 1, False),
            (0, 25, 1, 1, False),
        ],
    )
    def test_pagination_metadata_counts_reachable_pages(
        total: int,
        size: int,
        page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        result = paginate_in_memory(range(total), PageRequest(page=page, size=size))
    
>       assert result.pages == expected_pages
E       AssertionError: assert 1 == 2
E        +  where 1 = Page(items=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], total=26, page=1, size=25, sort=None, direction='asc').pages

tests/unit/test_pagination.py:29: AssertionError
_______ test_pagination_metadata_counts_reachable_pages[26-25-2-2-False] _______

total = 26, size = 25, page = 2, expected_pages = 2, expected_has_next = False

    @pytest.mark.parametrize(
        ("total", "size", "page", "expected_pages", "expected_has_next"),
        [
            (26, 25, 1, 2, True),
            (26, 25, 2, 2, False),
            (50, 25, 2, 2, False),
            (1, 25, 1, 1, False),
            (0, 25, 1, 1, False),
        ],
    )
    def test_pagination_metadata_counts_reachable_pages(
        total: int,
        size: int,
        page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        result = paginate_in_memory(range(total), PageRequest(page=page, size=size))
    
>       assert result.pages == expected_pages
E       AssertionError: assert 1 == 2
E        +  where 1 = Page(items=[25], total=26, page=2, size=25, sort=None, direction='asc').pages

tests/unit/test_pagination.py:29: AssertionError
____________ test_paginated_response_keeps_existing_metadata_fields ____________

    def test_paginated_response_keeps_existing_metadata_fields() -> None:
        result = paginate_in_memory(range(26), PageRequest(page=1, size=25))
    
>       assert result.to_dict() == {
            "items": list(range(25)),
            "page": 1,
            "size": 25,
            "total": 26,
            "pages": 2,
            "sort": None,
            "direction": "asc",
            "has_next": True,
            "has_prev": False,
        }
E       AssertionError: assert {'direction':... 5, ...], ...} == {'direction':... 5, ...], ...}
E         
E         Omitting 7 identical items, use -vv to show
E         Differing items:
E         {'has_next': False} != {'has_next': True}
E         {'pages': 1} != {'pages': 2}
E         
E         Full diff:
E           {
E               'direction': 'asc',
E         -     'has_next': True,
E         ?                 ^^^
E         +     'has_next': False,
E         ?                 ^^^^
E               'has_prev': False,
E               'items': [
E                   0,
E                   1,
E                   2,
E                   3,
E                   4,
E                   5,
E                   6,
E                   7,
E                   8,
E                   9,
E                   10,
E                   11,
E                   12,
E                   13,
E                   14,
E                   15,
E                   16,
E                   17,
E                   18,
E                   19,
E                   20,
E                   21,
E                   22,
E                   23,
E                   24,
E               ],
E               'page': 1,
E         -     'pages': 2,
E         ?              ^
E         +     'pages': 1,
E         ?              ^
E               'size': 25,
E               'sort': None,
E               'total': 26,
E           }

tests/unit/test_pagination.py:36: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_pagination.py::test_pagination_metadata_counts_reachable_pages[26-25-1-2-True] - AssertionError: assert 1 == 2
 +  where 1 = Page(items=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], total=26, page=1, size=25, sort=None, direction='asc').pages
FAILED tests/unit/test_pagination.py::test_pagination_metadata_counts_reachable_pages[26-25-2-2-False] - AssertionError: assert 1 == 2
 +  where 1 = Page(items=[25], total=26, page=2, size=25, sort=None, direction='asc').pages
FAILED tests/unit/test_pagination.py::test_paginated_response_keeps_existing_metadata_fields - AssertionError: assert {'direction':... 5, ...], ...} == {'direction':... 5, ...], ...}
  
  Omitting 7 identical items, use -vv to show
  Differing items:
  {'has_next': False} != {'has_next': True}
  {'pages': 1} != {'pages': 2}
  
  Full diff:
    {
        'direction': 'asc',
  -     'has_next': True,
  ?                 ^^^
  +     'has_next': False,
  ?                 ^^^^
        'has_prev': False,
        'items': [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
        ],
        'page': 1,
  -     'pages': 2,
  ?              ^
  +     'pages': 1,
  ?              ^
        'size': 25,
        'sort': None,
        'total': 26,
    }
3 failed, 3 passed in 0.10s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.08s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/core/pagination.py, tests/unit/test_pagination.py
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
<summary>fastapi-rag-gateway__751186a3b56__mRjxpEE: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__751186a3b567`
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
hidden reference tests: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_pagination.py` exited 1
STDOUT:
F...F                                                                    [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
______ test_non_multiple_total_counts_trailing_partial_page_as_reachable _______

    def test_non_multiple_total_counts_trailing_partial_page_as_reachable() -> None:
        page = paginate_in_memory(range(25), PageRequest(page=2, size=10))
    
        assert page.items == list(range(10, 20))
        assert page.total == 25
>       assert page.pages == 3
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[10, 11, 12, 13, 14, 15, 16, 17, 18, 19], total=25, page=2, size=10, sort=None, direction='asc').pages

tests/unit/test_pagination.py:13: AssertionError
________ test_last_page_next_indicator_is_false_for_partial_final_page _________

    def test_last_page_next_indicator_is_false_for_partial_final_page() -> None:
        page = paginate_in_memory(range(25), PageRequest(page=3, size=10))
    
        assert page.items == list(range(20, 25))
>       assert page.pages == 3
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[20, 21, 22, 23, 24], total=25, page=3, size=10, sort=None, direction='asc').pages

tests/unit/test_pagination.py:50: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_pagination.py::test_non_multiple_total_counts_trailing_partial_page_as_reachable - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[10, 11, 12, 13, 14, 15, 16, 17, 18, 19], total=25, page=2, size=10, sort=None, direction='asc').pages
FAILED tests/unit/test_pagination.py::test_last_page_next_indicator_is_false_for_partial_final_page - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[20, 21, 22, 23, 24], total=25, page=3, size=10, sort=None, direction='asc').pages
2 failed, 3 passed in 0.10s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
.....                                                                    [100%]Running teardown with pytest sessionfinish...

5 passed in 0.03s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/core/pagination.py, tests/unit/test_pagination.py
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
<summary>fastapi-rag-gateway__751186a3b56__nRmKStE: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__751186a3b567`
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
hidden reference tests: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_pagination.py` exited 1
STDOUT:
F...FF                                                                   [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_________ test_page_metadata_counts_all_reachable_pages[11-5-2-3-True] _________

total = 11, size = 5, current_page = 2, expected_pages = 3
expected_has_next = True

    @pytest.mark.parametrize(
        ("total", "size", "current_page", "expected_pages", "expected_has_next"),
        [
            (11, 5, 2, 3, True),
            (10, 5, 2, 2, False),
            (3, 5, 1, 1, False),
            (0, 5, 1, 1, False),
            (11, 5, 3, 3, False),
        ],
    )
    def test_page_metadata_counts_all_reachable_pages(
        total: int,
        size: int,
        current_page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        page = Page[int](items=[], total=total, page=current_page, size=size)
    
>       assert page.pages == expected_pages
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[], total=11, page=2, size=5, sort=None, direction='asc').pages

tests/unit/test_pagination.py:29: AssertionError
________ test_page_metadata_counts_all_reachable_pages[11-5-3-3-False] _________

total = 11, size = 5, current_page = 3, expected_pages = 3
expected_has_next = False

    @pytest.mark.parametrize(
        ("total", "size", "current_page", "expected_pages", "expected_has_next"),
        [
            (11, 5, 2, 3, True),
            (10, 5, 2, 2, False),
            (3, 5, 1, 1, False),
            (0, 5, 1, 1, False),
            (11, 5, 3, 3, False),
        ],
    )
    def test_page_metadata_counts_all_reachable_pages(
        total: int,
        size: int,
        current_page: int,
        expected_pages: int,
        expected_has_next: bool,
    ) -> None:
        page = Page[int](items=[], total=total, page=current_page, size=size)
    
>       assert page.pages == expected_pages
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[], total=11, page=3, size=5, sort=None, direction='asc').pages

tests/unit/test_pagination.py:29: AssertionError
______________ test_paginate_in_memory_returns_final_partial_page ______________

    def test_paginate_in_memory_returns_final_partial_page() -> None:
        page = paginate_in_memory(range(11), PageRequest(page=3, size=5))
    
        assert page.items == [10]
        assert page.total == 11
>       assert page.pages == 3
E       AssertionError: assert 2 == 3
E        +  where 2 = Page(items=[10], total=11, page=3, size=5, sort=None, direction='asc').pages

tests/unit/test_pagination.py:49: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_pagination.py::test_page_metadata_counts_all_reachable_pages[11-5-2-3-True] - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[], total=11, page=2, size=5, sort=None, direction='asc').pages
FAILED tests/unit/test_pagination.py::test_page_metadata_counts_all_reachable_pages[11-5-3-3-False] - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[], total=11, page=3, size=5, sort=None, direction='asc').pages
FAILED tests/unit/test_pagination.py::test_paginate_in_memory_returns_final_partial_page - AssertionError: assert 2 == 3
 +  where 2 = Page(items=[10], total=11, page=3, size=5, sort=None, direction='asc').pages
3 failed, 3 passed in 0.06s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_pagination.py` exited 0
STDOUT:
......                                                                   [100%]Running teardown with pytest sessionfinish...

6 passed in 0.03s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/core/pagination.py, tests/unit/test_pagination.py
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

