"""Builds the system prompt for the AI concierge chat endpoint.

The system prompt injects the user's full health profile, prediction, and
risk factors so the LLM can answer questions grounded in their actual data.
"""

_LIFESTYLE_LABELS: dict[str, str] = {
    "diet_fruits_veggies":   "Fruits & vegetables",
    "diet_processed_foods":  "Processed food frequency",
    "diet_sugar":            "Sugar intake",
    "diet_water":            "Daily water intake",
    "exercise_cardio":       "Cardio exercise",
    "exercise_weights":      "Weightlifting",
    "exercise_mobility":     "Yoga / stretching",
    "exercise_sitting":      "Daily sitting time",
    "sleep_duration":        "Sleep ≥7 hours",
    "sleep_trouble":         "Sleep trouble frequency",
    "community_time":        "Time with friends & family",
    "relationship_status":   "Relationship status",
    "children":              "Children",
    "social_support":        "Social support",
    "household_income":      "Household income",
    "alcohol":               "Alcohol consumption",
    "nicotine":              "Nicotine use",
    "stress":                "Stress frequency",
    "mental_health_impact":  "Mental health impact",
    "checkups":              "Health check-up frequency",
    "cancer_screenings":     "Cancer screening frequency",
    "grandparents_max_age":  "Grandparents' maximum age",
    "blood_pressure":        "Blood pressure",
    "ldl":                   "LDL cholesterol",
    "glucose":               "Fasting blood glucose",
    "overweight":            "Overweight status",
    "chronic_disease":       "Chronic disease",
    "bloodwork_recency":     "Recent bloodwork",
}


def _fmt_sign(value: float) -> str:
    return f"+{value:.1f}" if value >= 0 else f"{value:.1f}"


def build_chat_system_prompt(
    raw_answers: dict,
    features: dict,
    prediction: dict,
    risk_factors: dict,
) -> str:
    name = raw_answers.get("first_name", "the user")
    age = int(features.get("age", 0))
    sex = "male" if features.get("sex_male") == 1 else "female"
    bmi = round(float(features.get("bmi", 0)), 1)

    death_age = prediction.get("predicted_death_age", 0)
    baseline = prediction.get("baseline_death_age", 0)
    years_vs = prediction.get("years_vs_baseline", 0)
    lifestyle_score = prediction.get("lifestyle_score", 0)
    remaining = prediction.get("remaining_years", 0)
    death_date = prediction.get("predicted_death_date", "unknown")

    # ── Risk factors ──────────────────────────────────────────────────────────
    actionable = risk_factors.get("actionable", [])
    clinical = risk_factors.get("clinical", [])

    risk_lines: list[str] = []
    for r in actionable:
        tag = "HIGH RISK" if r["level"] == "high_risk" else "NEEDS IMPROVEMENT"
        risk_lines.append(f"  • {r['label']} [{tag}]")
    for r in clinical:
        tag = "HIGH RISK" if r["level"] == "high_risk" else "NEEDS IMPROVEMENT"
        risk_lines.append(f"  • {r['label']} [{tag}] (clinical marker)")

    risk_text = "\n".join(risk_lines) if risk_lines else "  No major risk factors flagged."

    # ── Lifestyle answers ─────────────────────────────────────────────────────
    lifestyle_lines: list[str] = []
    for key, label in _LIFESTYLE_LABELS.items():
        val = raw_answers.get(key)
        if val is not None:
            lifestyle_lines.append(f"  • {label}: {val}")

    # Height + weight
    hu = raw_answers.get("height_unit")
    hv = raw_answers.get("height_value")
    if hv is not None:
        if hu == "ft_in" and isinstance(hv, list) and len(hv) == 2:
            lifestyle_lines.insert(0, f"  • Height: {hv[0]}ft {hv[1]}in")
        elif hu == "m":
            lifestyle_lines.insert(0, f"  • Height: {hv}m")
        else:
            lifestyle_lines.insert(0, f"  • Height: {hv}cm")

    wv = raw_answers.get("weight_value")
    wu = raw_answers.get("weight_unit", "lb")
    if wv is not None:
        lifestyle_lines.insert(1, f"  • Weight: {wv} {wu}")

    lifestyle_text = "\n".join(lifestyle_lines) if lifestyle_lines else "  No lifestyle data available."

    return f"""You are a personal AI longevity advisor for {name}. You have their complete health profile and a statistically derived life expectancy estimate computed by a vitality drift model anchored to SSA actuarial life tables. Your job is to help them understand their health, their prediction, and how to improve their longevity — always grounded in their actual data.

LIFE EXPECTANCY PREDICTION:
  • Predicted age at death: {death_age:.1f} years (estimated {death_date})
  • Population baseline (same age & sex): {baseline:.1f} years
  • Delta vs. baseline: {_fmt_sign(years_vs)} years
  • Lifestyle score: {lifestyle_score:.0f} / 100
  • Estimated years remaining: {remaining:.1f}

USER PROFILE:
  • Name: {name}
  • Age: {age}
  • Sex: {sex}
  • BMI: {bmi}

TOP RISK FACTORS:
{risk_text}

FULL HEALTH DATA:
{lifestyle_text}

INSTRUCTIONS:
- NEVER change, invent, or contradict the numbers above. You explain and contextualize the prediction — you do not produce a new one.
- Always personalise your answers by referencing {name}'s specific data (e.g. "Since you reported daily processed food...").
- Be warm, honest, and evidence-informed. Acknowledge that the prediction is a statistical estimate, not a guarantee.
- For clinical markers (blood pressure, cholesterol, glucose), always recommend they confirm results with a doctor.
- Keep replies focused — 5 concise sentences unless the user asks for detail.
- If a question is outside what the data covers, say so and suggest they discuss it with a healthcare provider.
- Do not repeat the raw numbers in every message — only include them when directly relevant."""
