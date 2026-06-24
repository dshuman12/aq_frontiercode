"""Risk factor identification and explanation payload assembly.

The LLM (if connected) only *explains* the death date — it never
invents or modifies the number computed by the statistical model.
"""

_BAD_FACTORS = {
    "processed_food_score":   "processed food consumption",
    "sugar_score":            "sugar intake",
    "sitting_score":          "sedentary time",
    "sleep_disturbance_score":"sleep problems",
    "alcohol_score":          "alcohol consumption",
    "nicotine_score":         "nicotine / tobacco use",
    "stress_score":           "chronic stress",
    "mental_health_score":    "mental health impact",
    "bp_score":               "blood pressure",
    "ldl_score":              "LDL cholesterol",
    "glucose_score":          "blood glucose",
    "chronic_disease_score":  "chronic disease",
    "overweight_score":       "weight / BMI",
}

_GOOD_FACTORS = {
    "fruitveg_score":         "fruit and vegetable intake",
    "cardio_score":           "cardiovascular exercise",
    "weights_score":          "strength training",
    "sleep_duration_score":   "sleep duration",
    "community_time_score":   "social connection",
    "support_score":          "social support",
    "screening_score":        "cancer screenings",
    "checkup_score":          "regular checkups",
}

_CLINICAL = {"blood pressure", "LDL cholesterol", "blood glucose", "chronic disease"}


def identify_risk_factors(
    features: dict,
    threshold: int = 2,
) -> list[tuple[str, int, str]]:
    """Return the user's most concerning risk factors.

    Returns a list of (factor_label, score, risk_level) sorted by severity.
    risk_level is "high_risk" for bad factors above threshold, or
    "needs_improvement" for good factors below threshold.
    """
    risks: list[tuple[str, int, str]] = []

    for key, label in _BAD_FACTORS.items():
        score = features.get(key, 0)
        if score >= threshold:
            risks.append((label, score, "high_risk"))

    for key, label in _GOOD_FACTORS.items():
        score = features.get(key, 0)
        if score <= 1:
            risks.append((label, 3 - score, "needs_improvement"))

    risks.sort(key=lambda x: x[1], reverse=True)
    return risks


def user_to_retrieval_queries(features: dict) -> list[str]:
    """Generate targeted PubMed-style search queries from the user's risk profile."""
    queries: list[str] = []

    if features.get("nicotine_score", 0) >= 2:
        queries.append("current smoking all-cause mortality cohort adults")
    if features.get("alcohol_score", 0) >= 2:
        queries.append("heavy alcohol consumption mortality risk adults")
    if features.get("sleep_disturbance_score", 0) >= 2:
        queries.append("sleep disturbance mortality meta-analysis adults")
    if features.get("sleep_duration_score", 0) <= 1:
        queries.append("short sleep duration mortality risk")
    if features.get("ldl_score", 0) >= 2:
        queries.append("LDL cholesterol all-cause mortality cohort")
    if features.get("bp_score", 0) >= 2:
        queries.append("hypertension blood pressure mortality hazard ratio")
    if features.get("glucose_score", 0) >= 2:
        queries.append("diabetes fasting glucose mortality risk")
    if features.get("sitting_score", 0) >= 2:
        queries.append("sedentary behavior prolonged sitting mortality")
    if features.get("cardio_score", 0) <= 1:
        queries.append("physical inactivity mortality risk exercise benefits")
    if features.get("stress_score", 0) >= 2:
        queries.append("chronic psychological stress mortality cortisol")
    if features.get("processed_food_score", 0) >= 2:
        queries.append("ultra-processed food consumption mortality risk")

    if not queries:
        queries.append("lifestyle factors all-cause mortality meta-analysis")

    return queries


def build_explanation_payload(
    raw_answers: dict,
    features: dict,
    prediction: dict,
    retrieved_chunks: list[dict] | None = None,
) -> dict:
    """Assemble the full context dict for the explanation layer."""
    risks      = identify_risk_factors(features)
    actionable = [(r[0], r[1], r[2]) for r in risks if r[0] not in _CLINICAL]
    clinical   = [(r[0], r[1], r[2]) for r in risks if r[0] in _CLINICAL]

    payload: dict = {
        "user_profile": {
            "name": raw_answers.get("first_name", "User"),
            "age":  features["age"],
            "sex":  "male" if features["sex_male"] else "female",
            "bmi":  features["bmi"],
        },
        "prediction": prediction,
        "risk_factors": {
            "actionable": [{"label": r[0], "score": r[1], "level": r[2]} for r in actionable],
            "clinical":   [{"label": r[0], "score": r[1], "level": r[2]} for r in clinical],
        },
        "retrieval_queries": user_to_retrieval_queries(features),
        "instructions": (
            "You are a longevity health advisor. Explain the user's life expectancy prediction. "
            "NEVER change or invent the death date — only explain the existing numbers. "
            "Cite evidence by PMID when available. "
            "Separate actionable factors (diet, exercise, sleep) from clinical factors (BP, cholesterol). "
            "Be encouraging but honest. Note uncertainty in all predictions."
        ),
    }

    if retrieved_chunks:
        payload["evidence_chunks"] = [
            {
                "text":   c.get("text", "")[:500],
                "pmid":   c.get("metadata", {}).get("pmid", ""),
                "title":  c.get("metadata", {}).get("title", ""),
                "factor": c.get("metadata", {}).get("factor_area", ""),
            }
            for c in retrieved_chunks
        ]

    return payload
