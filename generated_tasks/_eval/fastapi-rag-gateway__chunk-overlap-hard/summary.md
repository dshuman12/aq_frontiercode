# FrontierCode Results

Trial mode: each trial is one independent agent solve trajectory. The agent receives the task description plus repository guidelines, produces a patch/output, and grading happens afterward.

- Trials: 5
- Effort groups: 1
- Final groups: 1

## Final Results

| Task | Agent | Model | Best Reasoning Effort | Trials | Final Pass Rate | Final Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Effort Results

| Task | Agent | Model | Reasoning Effort | Trials | Pass Rate | Average Score | Mean Reward |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | 5 | 1.000 | 1.000 | 1.000 |

## Trial Details

| Task | Agent | Model | Reasoning Effort | Submission | Pass | Criteria | Categories | Score | Blocker Failures |
| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__chunk-overl__4ftKwFW | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__chunk-overl__KDRtYNL | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__chunk-overl__KPSgzhd | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__chunk-overl__UmFY7G4 | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |
| fastapi-rag-gateway__chunk-overlap-hard | codex | openai/gpt-5.5 | high | fastapi-rag-gateway__chunk-overl__v6s7DrX | yes | 20/20 | patch_specific 6/6, regular 14/14 | 1.000 |  |

## Grader Details

Trial pass/fail is determined by blocker criteria. Trial score is the weighted average of criterion scores, including failed trials.

<details>
<summary>fastapi-rag-gateway__chunk-overl__4ftKwFW: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__chunk-overlap-hard`
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
...........                                                              [100%]Running teardown with pytest sessionfinish...

11 passed in 0.24s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FFF.                                                                     [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
__________________ test_fixed_chunker_supports_small_overlap ___________________

    def test_fixed_chunker_supports_small_overlap() -> None:
        text = "".join(chr(codepoint) for codepoint in range(33, 123))
    
>       _assert_fixed_chunks_contract(text, chunk_size=12, chunk_overlap=1)

tests/unit/test_chunking.py:30: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz'

    def _assert_fixed_chunks_contract(text: str, *, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        if not text:
            assert chunks == []
            return
    
        assert chunks
    
        for previous, current in zip(chunks, chunks[1:], strict=False):
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               AssertionError: assert ',' == '-'
E                 
E                 - -
E                 + ,

tests/unit/test_chunking.py:18: AssertionError
_______________ test_fixed_chunker_supports_small_stride_overlap _______________

    def test_fixed_chunker_supports_small_stride_overlap() -> None:
        text = "".join(chr(codepoint) for codepoint in range(33, 65))
    
>       _assert_fixed_chunks_contract(text, chunk_size=6, chunk_overlap=5)

tests/unit/test_chunking.py:36: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = '!"#$%&\'()*+,-./0123456789:;<=>?@'

    def _assert_fixed_chunks_contract(text: str, *, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        if not text:
            assert chunks == []
            return
    
        assert chunks
    
        for previous, current in zip(chunks, chunks[1:], strict=False):
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               assert '"#$%&' == "#$%&'"
E                 
E                 - #$%&'
E                 ?     -
E                 + "#$%&
E                 ? +

tests/unit/test_chunking.py:18: AssertionError
___________________ test_fixed_chunker_supports_zero_overlap ___________________

    def test_fixed_chunker_supports_zero_overlap() -> None:
        text = "".join(chr(codepoint) for codepoint in range(33, 70))
    
>       _assert_fixed_chunks_contract(text, chunk_size=10, chunk_overlap=0)

tests/unit/test_chunking.py:42: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDE'

    def _assert_fixed_chunks_contract(text: str, *, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        if not text:
            assert chunks == []
            return
    
        assert chunks
    
        for previous, current in zip(chunks, chunks[1:], strict=False):
            if chunk_overlap:
                assert previous[-chunk_overlap:] == current[:chunk_overlap]
                assert previous[-(chunk_overlap + 1) :] != current[: chunk_overlap + 1]
            else:
                assert previous[-1:] != current[:1]
    
        reconstructed = chunks[0] + "".join(chunk[chunk_overlap:] for chunk in chunks[1:])
>       assert reconstructed == text
E       assert '!"#$%&\'()*,...89:;<=>?@BCDE' == '!"#$%&\'()*+...9:;<=>?@ABCDE'
E         
E         - !"#$%&'()*+,-./0123456789:;<=>?@ABCDE
E         ?           -          -          -
E         + !"#$%&'()*,-./012345789:;<=>?@BCDE

tests/unit/test_chunking.py:24: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_supports_small_overlap - AssertionError: assert ',' == '-'
  
  - -
  + ,
FAILED tests/unit/test_chunking.py::test_fixed_chunker_supports_small_stride_overlap - assert '"#$%&' == "#$%&'"
  
  - #$%&'
  ?     -
  + "#$%&
  ? +
FAILED tests/unit/test_chunking.py::test_fixed_chunker_supports_zero_overlap - assert '!"#$%&\'()*,...89:;<=>?@BCDE' == '!"#$%&\'()*+...9:;<=>?@ABCDE'
  
  - !"#$%&'()*+,-./0123456789:;<=>?@ABCDE
  ?           -          -          -
  + !"#$%&'()*,-./012345789:;<=>?@BCDE
3 failed, 1 passed in 0.23s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
....                                                                     [100%]Running teardown with pytest sessionfinish...

4 passed in 0.20s

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
<summary>fastapi-rag-gateway__chunk-overl__KDRtYNL: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__chunk-overlap-hard`
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
...........                                                              [100%]Running teardown with pytest sessionfinish...

11 passed in 0.22s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FFF.                                                                     [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
______ test_fixed_chunker_preserves_overlap_seams_and_full_coverage[12-1] ______

chunk_size = 12, chunk_overlap = 1

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (12, 1),
            (12, 0),
            (8, 7),
        ],
    )
    def test_fixed_chunker_preserves_overlap_seams_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
        text = (string.ascii_letters + string.digits + string.punctuation)[:80]
    
>       _assert_fixed_chunk_contract(
            text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

tests/unit/test_chunking.py:55: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<'

    def _assert_fixed_chunk_contract(text: str, *, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        if not text:
            assert chunks == []
            return
    
        stride = chunk_size - chunk_overlap
        expected_starts = []
        start = 0
        while start < len(text):
            expected_starts.append(start)
            if start + chunk_size >= len(text):
                break
            start += stride
    
>       assert chunks == [text[start : start + chunk_size] for start in expected_starts]
E       assert ['abcdefghijk...%&\'()*', ...] == ['abcdefghijk...89!"#$%', ...]
E         
E         At index 1 diff: 'mnopqrstuvwx' != 'lmnopqrstuvw'
E         Right contains one more item: ':;<'
E         
E         Full diff:
E           [
E               'abcdefghijkl',
E         -     'lmnopqrstuvw',
E         ?      -
E         +     'mnopqrstuvwx',
E         ?                 +
E         -     'wxyzABCDEFGH',
E         ?      --
E         +     'yzABCDEFGHIJ',
E         ?                ++
E         -     'HIJKLMNOPQRS',
E         ?      ---
E         +     'KLMNOPQRSTUV',
E         ?               +++
E         -     'STUVWXYZ0123',
E         ?      ----
E         +     'WXYZ01234567',
E         ?              ++++
E         +     '89!"#$%&\'()*',
E         -     '3456789!"#$%',
E         -     "%&'()*+,-./:",
E         -     ':;<',
E         +     '+,-./:;<',
E         ?      +++++
E           ]

tests/unit/test_chunking.py:29: AssertionError
______ test_fixed_chunker_preserves_overlap_seams_and_full_coverage[12-0] ______

chunk_size = 12, chunk_overlap = 0

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (12, 1),
            (12, 0),
            (8, 7),
        ],
    )
    def test_fixed_chunker_preserves_overlap_seams_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
        text = (string.ascii_letters + string.digits + string.punctuation)[:80]
    
>       _assert_fixed_chunk_contract(
            text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

tests/unit/test_chunking.py:55: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<'

    def _assert_fixed_chunk_contract(text: str, *, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        if not text:
            assert chunks == []
            return
    
        stride = chunk_size - chunk_overlap
        expected_starts = []
        start = 0
        while start < len(text):
            expected_starts.append(start)
            if start + chunk_size >= len(text):
                break
            start += stride
    
>       assert chunks == [text[start : start + chunk_size] for start in expected_starts]
E       assert ['abcdefghijk...)*+,-./", ...] == ['abcdefghijk...%&\'()*', ...]
E         
E         At index 1 diff: 'nopqrstuvwxy' != 'mnopqrstuvwx'
E         
E         Full diff:
E           [
E               'abcdefghijkl',
E         -     'mnopqrstuvwx',
E         ?      -
E         +     'nopqrstuvwxy',
E         ?                 +
E         -     'yzABCDEFGHIJ',
E         ?      --
E         +     'ABCDEFGHIJKL',
E         ?                ++
E         -     'KLMNOPQRSTUV',
E         ?      ---
E         +     'NOPQRSTUVWXY',
E         ?               +++
E         -     'WXYZ01234567',
E         ?      ----
E         +     '0123456789!"',
E         ?              ++++
E         -     '89!"#$%&\'()*',
E         +     "$%&'()*+,-./",
E         -     '+,-./:;<',
E         ?      ------
E         +     ';<',
E           ]

tests/unit/test_chunking.py:29: AssertionError
______ test_fixed_chunker_preserves_overlap_seams_and_full_coverage[8-7] _______

chunk_size = 8, chunk_overlap = 7

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (12, 1),
            (12, 0),
            (8, 7),
        ],
    )
    def test_fixed_chunker_preserves_overlap_seams_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
        text = (string.ascii_letters + string.digits + string.punctuation)[:80]
    
>       _assert_fixed_chunk_contract(
            text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

tests/unit/test_chunking.py:55: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<'

    def _assert_fixed_chunk_contract(text: str, *, chunk_size: int, ch
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
....                                                                     [100%]Running teardown with pytest sessionfinish...

4 passed in 0.23s

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
<summary>fastapi-rag-gateway__chunk-overl__KPSgzhd: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__chunk-overlap-hard`
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
...........                                                              [100%]Running teardown with pytest sessionfinish...

11 passed in 0.22s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FFF.                                                                     [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
_ test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU-10-1] _

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU', chunk_size = 10
chunk_overlap = 1

    @pytest.mark.parametrize(
        ("text", "chunk_size", "chunk_overlap"),
        [
            (SOURCE_TEXT[:47], 10, 1),
            (SOURCE_TEXT[:47], 10, 0),
            (SOURCE_TEXT[:24], 6, 5),
            ("short text", 32, 8),
        ],
    )
    def test_fixed_chunker_preserves_overlap_and_full_coverage(
        text: str, chunk_size: int, chunk_overlap: int
    ) -> None:
        chunker = FixedChunker(ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap))
    
        chunks = chunker.split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
        for previous, current in zip(chunks, chunks[1:]):
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               AssertionError: assert 'j' == 'k'
E                 
E                 - k
E                 + j

tests/unit/test_chunking.py:34: AssertionError
_ test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU-10-0] _

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU', chunk_size = 10
chunk_overlap = 0

    @pytest.mark.parametrize(
        ("text", "chunk_size", "chunk_overlap"),
        [
            (SOURCE_TEXT[:47], 10, 1),
            (SOURCE_TEXT[:47], 10, 0),
            (SOURCE_TEXT[:24], 6, 5),
            ("short text", 32, 8),
        ],
    )
    def test_fixed_chunker_preserves_overlap_and_full_coverage(
        text: str, chunk_size: int, chunk_overlap: int
    ) -> None:
        chunker = FixedChunker(ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap))
    
        chunks = chunker.split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
        for previous, current in zip(chunks, chunks[1:]):
            if chunk_overlap:
                assert previous[-chunk_overlap:] == current[:chunk_overlap]
            else:
>               assert previous + current in text
E               AssertionError: assert ('abcdefghij' + 'lmnopqrstu') in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU'

tests/unit/test_chunking.py:36: AssertionError
_ test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwx-6-5] _

text = 'abcdefghijklmnopqrstuvwx', chunk_size = 6, chunk_overlap = 5

    @pytest.mark.parametrize(
        ("text", "chunk_size", "chunk_overlap"),
        [
            (SOURCE_TEXT[:47], 10, 1),
            (SOURCE_TEXT[:47], 10, 0),
            (SOURCE_TEXT[:24], 6, 5),
            ("short text", 32, 8),
        ],
    )
    def test_fixed_chunker_preserves_overlap_and_full_coverage(
        text: str, chunk_size: int, chunk_overlap: int
    ) -> None:
        chunker = FixedChunker(ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap))
    
        chunks = chunker.split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
        for previous, current in zip(chunks, chunks[1:]):
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               AssertionError: assert 'bcdef' == 'cdefg'
E                 
E                 - cdefg
E                 ?     -
E                 + bcdef
E                 ? +

tests/unit/test_chunking.py:34: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU-10-1] - AssertionError: assert 'j' == 'k'
  
  - k
  + j
FAILED tests/unit/test_chunking.py::test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU-10-0] - AssertionError: assert ('abcdefghij' + 'lmnopqrstu') in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU'
FAILED tests/unit/test_chunking.py::test_fixed_chunker_preserves_overlap_and_full_coverage[abcdefghijklmnopqrstuvwx-6-5] - AssertionError: assert 'bcdef' == 'cdefg'
  
  - cdefg
  ?     -
  + bcdef
  ? +
3 failed, 1 passed in 0.25s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
....                                                                     [100%]Running teardown with pytest sessionfinish...

4 passed in 0.29s

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
<summary>fastapi-rag-gateway__chunk-overl__UmFY7G4: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__chunk-overlap-hard`
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
...........                                                              [100%]Running teardown with pytest sessionfinish...

11 passed in 0.21s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FFFF.                                                                    [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
______ test_fixed_chunker_preserves_exact_overlap_and_full_coverage[10-3] ______

chunk_size = 10, chunk_overlap = 3

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (10, 3),
            (9, 1),
            (8, 7),
            (11, 0),
        ],
    )
    def test_fixed_chunker_preserves_exact_overlap_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
>       _assert_fixed_chunks_cover_with_overlap(UNIQUE_TEXT, chunk_size, chunk_overlap)

tests/unit/test_chunking.py:52: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
chunk_size = 10, chunk_overlap = 3

    def _assert_fixed_chunks_cover_with_overlap(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
    
        reconstructed = chunks[0] + "".join(chunk[chunk_overlap:] for chunk in chunks[1:])
>       assert reconstructed == text
E       AssertionError: assert 'abcdefghijlm...VWXZ012345789' == 'abcdefghijkl...XYZ0123456789'
E         
E         - abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
E         ?           -       -       -       -       -       -       -
E         + abcdefghijlmnopqrtuvwxyzBCDEFGHJKLMNOPRSTUVWXZ012345789

tests/unit/test_chunking.py:32: AssertionError
______ test_fixed_chunker_preserves_exact_overlap_and_full_coverage[9-1] _______

chunk_size = 9, chunk_overlap = 1

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (10, 3),
            (9, 1),
            (8, 7),
            (11, 0),
        ],
    )
    def test_fixed_chunker_preserves_exact_overlap_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
>       _assert_fixed_chunks_cover_with_overlap(UNIQUE_TEXT, chunk_size, chunk_overlap)

tests/unit/test_chunking.py:52: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
chunk_size = 9, chunk_overlap = 1

    def _assert_fixed_chunks_cover_with_overlap(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
    
        reconstructed = chunks[0] + "".join(chunk[chunk_overlap:] for chunk in chunks[1:])
>       assert reconstructed == text
E       AssertionError: assert 'abcdefghiklm...WXYZ013456789' == 'abcdefghijkl...XYZ0123456789'
E         
E         - abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
E         ?          -        -        -        -        -        -
E         + abcdefghiklmnopqrtuvwxyzACDEFGHIJLMNOPQRSUVWXYZ013456789

tests/unit/test_chunking.py:32: AssertionError
______ test_fixed_chunker_preserves_exact_overlap_and_full_coverage[8-7] _______

chunk_size = 8, chunk_overlap = 7

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (10, 3),
            (9, 1),
            (8, 7),
            (11, 0),
        ],
    )
    def test_fixed_chunker_preserves_exact_overlap_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
>       _assert_fixed_chunks_cover_with_overlap(UNIQUE_TEXT, chunk_size, chunk_overlap)

tests/unit/test_chunking.py:52: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
chunk_size = 8, chunk_overlap = 7

    def _assert_fixed_chunks_cover_with_overlap(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
    
        reconstructed = chunks[0] + "".join(chunk[chunk_overlap:] for chunk in chunks[1:])
>       assert reconstructed == text
E       AssertionError: assert 'abcdefghjlnp...LNPRTVXZ13579' == 'abcdefghijkl...XYZ0123456789'
E         
E         - abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
E         + abcdefghjlnprtvxzBDFHJLNPRTVXZ13579

tests/unit/test_chunking.py:32: AssertionError
______ test_fixed_chunker_preserves_exact_overlap_and_full_coverage[11-0] ______

chunk_size = 11, chunk_overlap = 0

    @pytest.mark.parametrize(
        ("chunk_size", "chunk_overlap"),
        [
            (10, 3),
            (9, 1),
            (8, 7),
            (11, 0),
        ],
    )
    def test_fixed_chunker_preserves_exact_overlap_and_full_coverage(
        chunk_size: int, chunk_overlap: int
    ) -> None:
>       _assert_fixed_chunks_cover_with_overlap(UNIQUE_TEXT, chunk_size, chunk_overlap)

tests/unit/test_chunking.py:52: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
chunk_size = 11, chunk_overlap = 0

    def _assert_fixed_chunks_cover_with_overlap(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert all(len(chunk) <= chunk_size for chunk in chunks)
    
        reconstructed = chunks[0] + "".join(chunk[chunk_overlap:] for chunk in chunks[1:])
>
...<truncated>...
STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
.....                                                                    [100%]Running teardown with pytest sessionfinish...

5 passed in 0.22s

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
<summary>fastapi-rag-gateway__chunk-overl__v6s7DrX: PASS, score 1.000, criteria 20/20</summary>

- Task: `fastapi-rag-gateway__chunk-overlap-hard`
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
...........                                                              [100%]Running teardown with pytest sessionfinish...

11 passed in 0.23s

STDERR:
```

#### `submitted_tests_fail_on_base` (PASS, score 1.000)

```text
Submitted tests failed on the broken base snapshot as expected.
submitted tests on base snapshot: `pytest tests/unit/test_chunking.py` exited 1
STDOUT:
FFF.                                                                     [100%]Running teardown with pytest sessionfinish...

=================================== FAILURES ===================================
______ test_fixed_chunker_honours_configured_overlap_at_chunk_boundaries _______

    def test_fixed_chunker_honours_configured_overlap_at_chunk_boundaries() -> None:
        text = "0123456789" * 4
    
>       _assert_fixed_chunks_cover_text(text, chunk_size=10, chunk_overlap=3)

tests/unit/test_chunking.py:29: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = '0123456789012345678901234567890123456789', chunk_size = 10
chunk_overlap = 3

    def _assert_fixed_chunks_cover_text(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert chunks[0] == text[:chunk_size]
    
        reconstructed = chunks[0]
        for index in range(1, len(chunks)):
            previous = chunks[index - 1]
            current = chunks[index]
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               AssertionError: assert '789' == '890'
E                 
E                 - 890
E                 + 789

tests/unit/test_chunking.py:18: AssertionError
_________ test_fixed_chunker_honours_small_overlap_at_chunk_boundaries _________

    def test_fixed_chunker_honours_small_overlap_at_chunk_boundaries() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
    
>       _assert_fixed_chunks_cover_text(text, chunk_size=8, chunk_overlap=1)

tests/unit/test_chunking.py:35: 
_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ 

text = 'abcdefghijklmnopqrstuvwxyz', chunk_size = 8, chunk_overlap = 1

    def _assert_fixed_chunks_cover_text(text: str, chunk_size: int, chunk_overlap: int) -> None:
        chunks = FixedChunker(
            ChunkOptions(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        ).split_text(text)
    
        assert chunks
        assert chunks[0] == text[:chunk_size]
    
        reconstructed = chunks[0]
        for index in range(1, len(chunks)):
            previous = chunks[index - 1]
            current = chunks[index]
            if chunk_overlap:
>               assert previous[-chunk_overlap:] == current[:chunk_overlap]
E               AssertionError: assert 'h' == 'i'
E                 
E                 - i
E                 + h

tests/unit/test_chunking.py:18: AssertionError
_____________ test_fixed_chunker_abuts_chunks_when_overlap_is_zero _____________

    def test_fixed_chunker_abuts_chunks_when_overlap_is_zero() -> None:
        text = "abcdefghijklmnopqrstuvwxyz"
        chunks = FixedChunker(ChunkOptions(chunk_size=8, chunk_overlap=0)).split_text(text)
    
>       assert chunks == ["abcdefgh", "ijklmnop", "qrstuvwx", "yz"]
E       AssertionError: assert ['abcdefgh', ...', 'stuvwxyz'] == ['abcdefgh', ...stuvwx', 'yz']
E         
E         At index 1 diff: 'jklmnopq' != 'ijklmnop'
E         Right contains one more item: 'yz'
E         
E         Full diff:
E           [
E               'abcdefgh',
E         -     'ijklmnop',
E         ?      -
E         +     'jklmnopq',
E         ?             +
E         -     'qrstuvwx',
E         ?      --
E         +     'stuvwxyz',
E         ?            ++
E         -     'yz',
E           ]

tests/unit/test_chunking.py:42: AssertionError
=========================== short test summary info ============================
FAILED tests/unit/test_chunking.py::test_fixed_chunker_honours_configured_overlap_at_chunk_boundaries - AssertionError: assert '789' == '890'
  
  - 890
  + 789
FAILED tests/unit/test_chunking.py::test_fixed_chunker_honours_small_overlap_at_chunk_boundaries - AssertionError: assert 'h' == 'i'
  
  - i
  + h
FAILED tests/unit/test_chunking.py::test_fixed_chunker_abuts_chunks_when_overlap_is_zero - AssertionError: assert ['abcdefgh', ...', 'stuvwxyz'] == ['abcdefgh', ...stuvwx', 'yz']
  
  At index 1 diff: 'jklmnopq' != 'ijklmnop'
  Right contains one more item: 'yz'
  
  Full diff:
    [
        'abcdefgh',
  -     'ijklmnop',
  ?      -
  +     'jklmnopq',
  ?             +
  -     'qrstuvwx',
  ?      --
  +     'stuvwxyz',
  ?            ++
  -     'yz',
    ]
3 failed, 1 passed in 0.28s

STDERR:
```

#### `visible_regression_tests_pass` (PASS, score 1.000)

```text
visible regression command: `pytest tests/unit/test_chunking.py` exited 0
STDOUT:
....                                                                     [100%]Running teardown with pytest sessionfinish...

4 passed in 0.22s

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

