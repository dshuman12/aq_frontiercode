import pytest
import os
import requests
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase
from deepeval import evaluate
from dotenv import load_dotenv

load_dotenv()

RAG_API_URL = "http://localhost:8000/query"

RAG_EVAL_DATA = [
    {
        "question": "What is the key mechanism used by the Transformer architecture?",
        "expected": "The key mechanism is self-attention, which weighs the significance of different words.",
        "ground_context": ["The foundation of modern machine learning relies heavily on Transformer architecture. This architecture utilizes a mechanism called self-attention to weigh the significance of different words in the input sequence."],
    },
    {
        "question": "Which Python web framework uses Pydantic for typed data models?",
        "expected": "FastAPI uses Pydantic to enable the easy creation of typed data models.",
        "ground_context": ["FastAPI is a high-performance Python web framework known for its speed... It is built on modern asynchronous libraries like Starlette and Pydantic, enabling easy creation of typed data models."],
    },
    {
        "question": "In what year was the first paper on the Transformer architecture introduced?",
        "expected": "The first Transformer paper, 'Attention Is All You Need,' was introduced in 2017.",
        "ground_context": ["The first paper introducing this was 'Attention Is All You Need' in 2017."],
    }
]

faithfulness_metric = FaithfulnessMetric(threshold=0.8, model="gpt-4o-mini")
relevancy_metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini")

@pytest.mark.parametrize("data", RAG_EVAL_DATA)
def test_rag_api_quality(data):
    """Tests the live RAG API for quality using DeepEval metrics."""
    try:
        response = requests.post(RAG_API_URL, json={"question": data["question"]})
        response.raise_for_status()
        api_result = response.json()
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Failed to connect to RAG API at {RAG_API_URL}: {e}. Ensure the API is running and Deepseek is accessible.")
        return

    actual_output = api_result.get("answer")
    retrieved_context = api_result.get("context")

    test_case = LLMTestCase(
        input=data["question"],
        actual_output=actual_output,
        expected_output=data["expected"],
        context=retrieved_context
    )

    results = evaluate(test_cases=[test_case], metrics=[faithfulness_metric, relevancy_metric])

    for result in results:
        for metric_name, score in result.scores.items():
            assert score >= 0.7, f"{metric_name} score too low: {score}"