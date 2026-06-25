"""Death Clock FastAPI backend.

Endpoints:
  GET  /health          → liveness check
  POST /predict         → full prediction from questionnaire answers
  POST /explain         → prediction + risk factors + retrieval queries
  POST /what-if         → compare base answers vs hypothetical overrides
"""

import os
from dotenv import load_dotenv
load_dotenv()

from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    PredictRequest,
    WhatIfRequest,
    PredictResponse,
    ExplainResponse,
    WhatIfResponse,
    ChatRequest,
    ChatResponse,
    ReportRequest,
    ReportResponse,
)
from .model.features import questionnaire_to_features
from .model.vitality import features_to_vitality_params, vitality_to_prediction
from .model.explain import build_explanation_payload, identify_risk_factors, user_to_retrieval_queries
from .model.chat import build_chat_system_prompt
from .model.report import build_report_prompts

_groq = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

app = FastAPI(
    title="Death Clock API",
    description="Longevity prediction engine backed by SSA life tables and vitality modelling.",
    version="1.0.0",
)

# Allow all origins during local development. Tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Neutral defaults for fields that the AI endpoints need but may be absent
# (e.g. activity_tracking is in onboarding but not the health-profile edit screen).
_ANSWER_DEFAULTS: dict = {
    "activity_tracking":    "No, not using any device",
    "household_income":     "Under $75k",
    "bloodwork_recency":    "Eager to get blood work done soon",
    "clinical_data_method": "None of the above",
    "checkups":             "Every two to three years",
    "cancer_screenings":    "Sometimes, but not consistently",
}


def _with_defaults(answers: dict) -> dict:
    """Return answers merged with neutral defaults for any missing required fields."""
    merged = dict(_ANSWER_DEFAULTS)
    merged.update(answers)   # user answers always win
    return merged


def _run_prediction(answers: dict) -> tuple[dict, dict, dict]:
    """Core pipeline: answers → features → vitality params → prediction."""
    try:
        features   = questionnaire_to_features(answers)
        sex        = "male" if features["sex_male"] == 1 else "female"
        params     = features_to_vitality_params(features)
        prediction = vitality_to_prediction(params, features["age"], sex, answers=answers)
        return features, params, prediction
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/health")
def health():
    return {"ok": True, "service": "death-clock-api"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Full prediction from a complete questionnaire answer set."""
    features, params, prediction = _run_prediction(req.answers)
    return {
        "features":       features,
        "vitality_params": params,
        "prediction":     prediction,
    }


@app.post("/explain", response_model=ExplainResponse)
def explain(req: PredictRequest):
    """Prediction plus risk factor breakdown and retrieval queries.

    Evidence chunks (RAG) are not included unless a vector DB is running.
    Connect ChromaDB + paper embeddings from notebook Section 9 to enable them.
    """
    features, params, prediction = _run_prediction(req.answers)
    payload = build_explanation_payload(req.answers, features, prediction)

    return {
        "features":         features,
        "vitality_params":  params,
        "prediction":       prediction,
        "risk_factors":     payload["risk_factors"],
        "retrieval_queries": payload["retrieval_queries"],
        "instructions":     payload["instructions"],
    }


@app.post("/report", response_model=ReportResponse)
def generate_report(req: ReportRequest):
    """Generate a fully personalised AI longevity report from the user's answers."""
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured.")

    answers = _with_defaults(req.answers)
    features, params, prediction = _run_prediction(answers)
    payload = build_explanation_payload(answers, features, prediction)
    system_prompt, user_message = build_report_prompts(
        raw_answers=answers,
        features=features,
        prediction=prediction,
        risk_factors=payload["risk_factors"],
    )

    try:
        import json
        response = _groq.chat.completions.create(
            model=os.getenv("CHAT_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=4096,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
        )
        raw_json = response.choices[0].message.content or "{}"
        report_data = json.loads(raw_json)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Report generation error: {exc}") from exc

    return {"report": report_data}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """RAG-grounded chat: answers questions about the user's health & prediction.

    The user's full profile and prediction are injected into the system prompt
    so the LLM has complete context for every turn.
    """
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured.")

    # Build context from the user's data
    answers = _with_defaults(req.answers)
    features, params, prediction = _run_prediction(answers)
    payload = build_explanation_payload(answers, features, prediction)
    system_prompt = build_chat_system_prompt(
        raw_answers=answers,
        features=features,
        prediction=prediction,
        risk_factors=payload["risk_factors"],
    )

    # Call Groq compound-beta
    try:
        response = _groq.chat.completions.create(
            model=os.getenv("CHAT_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=1024,
            messages=[
                {"role": "system", "content": system_prompt},
                *[{"role": m.role, "content": m.content} for m in req.messages],
            ],
        )
        reply = response.choices[0].message.content or ""
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return {"reply": reply}


@app.post("/what-if", response_model=WhatIfResponse)
def what_if(req: WhatIfRequest):
    """Compare a base prediction against a hypothetical lifestyle change.

    Example: what happens if the user quits smoking and starts exercising?
    Pass the base answers in `answers` and the changes in `overrides`.
    """
    base_features, base_params, base_prediction = _run_prediction(req.answers)

    hypo_answers = {**req.answers, **req.overrides}
    hypo_features, hypo_params, hypo_prediction = _run_prediction(hypo_answers)

    delta = round(
        hypo_prediction["predicted_death_age"] - base_prediction["predicted_death_age"],
        1,
    )

    return {
        "base": {
            "features":        base_features,
            "vitality_params": base_params,
            "prediction":      base_prediction,
        },
        "hypothetical": {
            "features":        hypo_features,
            "vitality_params": hypo_params,
            "prediction":      hypo_prediction,
        },
        "delta_years":    delta,
        "changed_fields": list(req.overrides.keys()),
    }
