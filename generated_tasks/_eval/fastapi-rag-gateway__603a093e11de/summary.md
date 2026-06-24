# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__603a093e11d__KFLVREp | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__603a093e11d__bCrV7zD | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__603a093e11d__i2uip9x | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__603a093e11d__okBEwWG | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__603a093e11de | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__603a093e11d__ycKXRhP | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>fastapi-rag-gateway__603a093e11d__KFLVREp: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__603a093e11de`
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
hidden reference tests: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.........                                                                [100%]Running teardown with pytest sessionfinish...

9 passed in 0.35s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
F..                                                                      [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
______________ test_fixed_chunker_applies_exact_character_overlap ______________

    def test_fixed_chunker_applies_exact_character_overlap() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
        chunker = FixedChunker(ChunkOptions(chunk_size=10, chunk_overlap=3))
    
        chunks = chunker.split_text(text)
    
>       assert chunks == ["abcdefghij", "hijklmnopq", "opqrstuvwx", "vwxyz"]
E       AssertionError: assert ['abcdefghij'...st', 'uvwxyz'] == ['abcdefghij'...vwx', 'vwxyz']
E         
E         At index 1 diff: 'klmnopqrst' != 'hijklmnopq'
E         Right contains one more item: 'vwxyz'
E         
E         Full diff:
E           [
E               'abcdefghij',
E         -     'hijklmnopq',
E         ?      ---
E         +     'klmnopqrst',
E         ?             +++
E         -     'opqrstuvwx',
E         -     'vwxyz',
E         +     'uvwxyz',
E         ?      +
E           ]

tests/unit/test_chunking.py:21: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_applies_exact_character_overlap - AssertionError: assert ['abcdefghij'...st', 'uvwxyz'] == ['abcdefghij'...vwx', 'vwxyz']
  
  At index 1 diff: 'klmnopqrst' != 'hijklmnopq'
  Right contains one more item: 'vwxyz'
  
  Full diff:
    [
        'abcdefghij',
  -     'hijklmnopq',
  ?      ---
  +     'klmnopqrst',
  ?             +++
  -     'opqrstuvwx',
  -     'vwxyz',
  +     'uvwxyz',
  ?      +
    ]
1 failed, 2 passed in 0.31s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
...                                                                      [100%]Running teardown with pytest sessionfinish...

3 passed in 0.30s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/rag/chunking/fixed.py, tests/unit/test_chunking.py
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
<summary>fastapi-rag-gateway__603a093e11d__bCrV7zD: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__603a093e11de`
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
hidden reference tests: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.........                                                                [100%]Running teardown with pytest sessionfinish...

9 passed in 0.28s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
F..                                                                      [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_________ test_fixed_chunker_overlaps_adjacent_chunks_and_covers_text __________

    def test_fixed_chunker_overlaps_adjacent_chunks_and_covers_text() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
        overlap = 3
        chunker = FixedChunker(ChunkOptions(chunk_size=10, chunk_overlap=overlap))
    
        chunks = chunker.split_text(text)
    
>       assert chunks == [
            "abcdefghij",
            "hijklmnopq",
            "opqrstuvwx",
            "vwxyz",
        ]
E       AssertionError: assert ['abcdefghij'...st', 'uvwxyz'] == ['abcdefghij'...vwx', 'vwxyz']
E         
E         At index 1 diff: 'klmnopqrst' != 'hijklmnopq'
E         Right contains one more item: 'vwxyz'
E         
E         Full diff:
E           [
E               'abcdefghij',
E         -     'hijklmnopq',
E         ?      ---
E         +     'klmnopqrst',
E         ?             +++
E         -     'opqrstuvwx',
E         -     'vwxyz',
E         +     'uvwxyz',
E         ?      +
E           ]

tests/unit/test_chunking.py:15: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_overlaps_adjacent_chunks_and_covers_text - AssertionError: assert ['abcdefghij'...st', 'uvwxyz'] == ['abcdefghij'...vwx', 'vwxyz']
  
  At index 1 diff: 'klmnopqrst' != 'hijklmnopq'
  Right contains one more item: 'vwxyz'
  
  Full diff:
    [
        'abcdefghij',
  -     'hijklmnopq',
  ?      ---
  +     'klmnopqrst',
  ?             +++
  -     'opqrstuvwx',
  -     'vwxyz',
  +     'uvwxyz',
  ?      +
    ]
1 failed, 2 passed in 0.32s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
...                                                                      [100%]Running teardown with pytest sessionfinish...

3 passed in 0.28s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/rag/chunking/fixed.py, tests/unit/test_chunking.py
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
<summary>fastapi-rag-gateway__603a093e11d__i2uip9x: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__603a093e11de`
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
hidden reference tests: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.........                                                                [100%]Running teardown with pytest sessionfinish...

9 passed in 0.29s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FF..                                                                     [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_________________ test_fixed_chunker_overlaps_adjacent_chunks __________________

    def test_fixed_chunker_overlaps_adjacent_chunks() -> None:
        overlap = 3
        chunker = FixedChunker(ChunkOptions(chunk_size=8, chunk_overlap=overlap))
    
        chunks = chunker.split_text("abcdefghijklmnopqrstuvwxyz")
    
>       assert chunks == [
            "abcdefgh",
            "fghijklm",
            "klmnopqr",
            "pqrstuvw",
            "uvwxyz",
        ]
E       AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
E         
E         At index 1 diff: 'ijklmnop' != 'fghijklm'
E         Right contains one more item: 'uvwxyz'
E         
E         Full diff:
E           [
E               'abcdefgh',
E         -     'fghijklm',
E         -     'klmnopqr',
E         ?            --
E         +     'ijklmnop',
E         ?      ++
E         -     'pqrstuvw',
E         ?      -
E         +     'qrstuvwx',
E         ?             +
E         -     'uvwxyz',
E         ?      ----
E         +     'yz',
E           ]

tests/unit/test_chunking.py:13: AssertionError
________ test_fixed_chunker_overlapping_chunks_cover_text_without_gaps _________

    def test_fixed_chunker_overlapping_chunks_cover_text_without_gaps() -> None:
        overlap = 4
        text = "0123456789abcdefghijklmnopqrstuvwxyz"
        chunker = FixedChunker(ChunkOptions(chunk_size=10, chunk_overlap=overlap))
    
        chunks = chunker.split_text(text)
        rebuilt = chunks[0] + "".join(chunk[overlap:] for chunk in chunks[1:])
    
>       assert rebuilt == text
E       AssertionError: assert '0123456789efghijopqrstyz' == '0123456789ab...nopqrstuvwxyz'
E         
E         - 0123456789abcdefghijklmnopqrstuvwxyz
E         ?           ----      ----      ----
E         + 0123456789efghijopqrstyz

tests/unit/test_chunking.py:32: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_overlaps_adjacent_chunks - AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
  
  At index 1 diff: 'ijklmnop' != 'fghijklm'
  Right contains one more item: 'uvwxyz'
  
  Full diff:
    [
        'abcdefgh',
  -     'fghijklm',
  -     'klmnopqr',
  ?            --
  +     'ijklmnop',
  ?      ++
  -     'pqrstuvw',
  ?      -
  +     'qrstuvwx',
  ?             +
  -     'uvwxyz',
  ?      ----
  +     'yz',
    ]
FAILED tests/unit/test_chunking.py::test_fixed_chunker_overlapping_chunks_cover_text_without_gaps - AssertionError: assert '0123456789efghijopqrstyz' == '0123456789ab...nopqrstuvwxyz'
  
  - 0123456789abcdefghijklmnopqrstuvwxyz
  ?           ----      ----      ----
  + 0123456789efghijopqrstyz
2 failed, 2 passed in 0.32s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
....                                                                     [100%]Running teardown with pytest sessionfinish...

4 passed in 0.48s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/rag/chunking/fixed.py, tests/unit/test_chunking.py
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
<summary>fastapi-rag-gateway__603a093e11d__okBEwWG: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__603a093e11de`
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
hidden reference tests: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.........                                                                [100%]Running teardown with pytest sessionfinish...

9 passed in 0.49s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
F..                                                                      [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_______ test_fixed_chunker_overlaps_adjacent_chunks_by_configured_amount _______

    def test_fixed_chunker_overlaps_adjacent_chunks_by_configured_amount() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
        overlap = 3
        chunker = FixedChunker(ChunkOptions(chunk_size=8, chunk_overlap=overlap))
    
        chunks = chunker.split_text(text)
    
>       assert chunks == ["abcdefgh", "fghijklm", "klmnopqr", "pqrstuvw", "uvwxyz"]
E       AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
E         
E         At index 1 diff: 'ijklmnop' != 'fghijklm'
E         Right contains one more item: 'uvwxyz'
E         
E         Full diff:
E           [
E               'abcdefgh',
E         -     'fghijklm',
E         -     'klmnopqr',
E         ?            --
E         +     'ijklmnop',
E         ?      ++
E         -     'pqrstuvw',
E         ?      -
E         +     'qrstuvwx',
E         ?             +
E         -     'uvwxyz',
E         ?      ----
E         +     'yz',
E           ]

tests/unit/test_chunking.py:17: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_overlaps_adjacent_chunks_by_configured_amount - AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
  
  At index 1 diff: 'ijklmnop' != 'fghijklm'
  Right contains one more item: 'uvwxyz'
  
  Full diff:
    [
        'abcdefgh',
  -     'fghijklm',
  -     'klmnopqr',
  ?            --
  +     'ijklmnop',
  ?      ++
  -     'pqrstuvw',
  ?      -
  +     'qrstuvwx',
  ?             +
  -     'uvwxyz',
  ?      ----
  +     'yz',
    ]
1 failed, 2 passed in 0.39s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
...                                                                      [100%]Running teardown with pytest sessionfinish...

3 passed in 0.28s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/rag/chunking/fixed.py, tests/unit/test_chunking.py
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
<summary>fastapi-rag-gateway__603a093e11d__ycKXRhP: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__603a093e11de`
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
hidden reference tests: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.........                                                                [100%]Running teardown with pytest sessionfinish...

9 passed in 0.53s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
F..                                                                      [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
__________________ test_fixed_chunker_uses_configured_overlap __________________

    def test_fixed_chunker_uses_configured_overlap() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
        overlap = 3
        chunker = FixedChunker(ChunkOptions(chunk_size=8, chunk_overlap=overlap))
    
        chunks = chunker.split_text(text)
    
>       assert chunks == ["abcdefgh", "fghijklm", "klmnopqr", "pqrstuvw", "uvwxyz"]
E       AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
E         
E         At index 1 diff: 'ijklmnop' != 'fghijklm'
E         Right contains one more item: 'uvwxyz'
E         
E         Full diff:
E           [
E               'abcdefgh',
E         -     'fghijklm',
E         -     'klmnopqr',
E         ?            --
E         +     'ijklmnop',
E         ?      ++
E         -     'pqrstuvw',
E         ?      -
E         +     'qrstuvwx',
E         ?             +
E         -     'uvwxyz',
E         ?      ----
E         +     'yz',
E           ]

tests/unit/test_chunking.py:16: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_uses_configured_overlap - AssertionError: assert ['abcdefgh', ...stuvwx', 'yz'] == ['abcdefgh', ...vw', 'uvwxyz']
  
  At index 1 diff: 'ijklmnop' != 'fghijklm'
  Right contains one more item: 'uvwxyz'
  
  Full diff:
    [
        'abcdefgh',
  -     'fghijklm',
  -     'klmnopqr',
  ?            --
  +     'ijklmnop',
  ?      ++
  -     'pqrstuvw',
  ?      -
  +     'qrstuvwx',
  ?             +
  -     'uvwxyz',
  ?      ----
  +     'yz',
    ]
1 failed, 2 passed in 0.47s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
...                                                                      [100%]Running teardown with pytest sessionfinish...

3 passed in 0.54s

STDERR:
```

#### `scope_matches_reference_intent` (PASS, score 1.000)

```text
Changed files stay within the generated reference scope: app/rag/chunking/fixed.py, tests/unit/test_chunking.py
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

