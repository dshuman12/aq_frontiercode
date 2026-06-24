"""Prompt builders for the AI-generated personalized longevity report."""

_LIFESTYLE_LABELS: dict[str, str] = {
    "diet_fruits_veggies":   "Fruits & vegetables",
    "diet_processed_foods":  "Processed food frequency",
    "diet_sugar":            "Sugar intake",
    "diet_water":            "Daily water intake",
    "exercise_cardio":       "Cardio exercise",
    "exercise_weights":      "Weightlifting",
    "exercise_mobility":     "Yoga / stretching",
    "exercise_sitting":      "Daily sitting time",
    "sleep_duration":        "Sleep ≥7 hours per night",
    "sleep_trouble":         "Sleep trouble frequency",
    "community_time":        "Social time",
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
    "grandparents_max_age":  "Grandparents' max age",
    "blood_pressure":        "Blood pressure",
    "ldl":                   "LDL cholesterol",
    "glucose":               "Fasting blood glucose",
    "overweight":            "Overweight status",
    "chronic_disease":       "Chronic disease",
    "bloodwork_recency":     "Recent bloodwork",
}

_JSON_SCHEMA = """\
{
  "your_journey": {
    "intro": "<2-3 sentences about their longevity journey so far, personalised to their data>",
    "milestones": [
      {"title": "Complete Your Health Survey", "body": "<1-2 sentences>", "done": true},
      {"title": "Schedule Your Blood Work", "body": "<1-2 sentences>", "done": false},
      {"title": "Complete Your Health Profile", "body": "<1-2 sentences>", "done": false}
    ]
  },
  "progress_and_trends": "<2-3 sentence paragraph about their baseline and what progress will look like>",
  "critical_findings": {
    "intro": "<1-2 sentences framing the critical findings>",
    "items": [
      {"title": "<finding title>", "body": "<2-3 sentences specific to their data, referencing their actual answers>"}
    ]
  },
  "positive_findings": {
    "intro": "<1-2 sentences>",
    "items": [
      {"title": "<strength title>", "body": "<2-3 sentences>", "next_step": "<specific action>", "status": "Current: <their answer> vs. Target: Maintain"}
    ]
  },
  "doctor_topics": {
    "intro": "<1-2 sentences>",
    "items": [
      {"title": "<topic title>", "body": "<2-3 sentences>", "goal": "<specific goal of the conversation>"}
    ]
  },
  "hormone_analysis": "<2-3 sentence paragraph, reference their sex, age, and any relevant lifestyle factors>",
  "genetics": "<2-3 sentence paragraph, reference grandparent longevity data and what to test>",
  "roadmap": {
    "intro": "<1-2 sentences specific to their age and situation>",
    "steps": [
      {"title": "Step 1: <title>", "body": "<2-3 sentences>"},
      {"title": "Step 2: <title>", "body": "<2-3 sentences>"},
      {"title": "Step 3: <title>", "body": "<2-3 sentences>"}
    ]
  },
  "behavioral_goals": {
    "intro": "<1-2 sentences>",
    "items": [
      {"title": "<goal title>", "body": "<2-3 sentences>", "evidence": "Consensus", "frequency": "<specific frequency or target>"}
    ]
  },
  "diet": {
    "intro": "<1-2 sentences referencing their specific diet answers>",
    "items": [
      {"title": "<diet goal title>", "body": "<2-3 sentences>", "evidence": "Consensus", "how": "<specific, actionable first step>"}
    ]
  },
  "supplements": {
    "intro": "<1-2 sentences>",
    "items": [
      {"title": "<supplement name>", "body": "<2-3 sentences explaining why for this specific person>"}
    ]
  },
  "devices": {
    "intro": "<1-2 sentences>",
    "items": [
      {"title": "<device name>", "body": "<1-2 sentences explaining why relevant for this person>"}
    ]
  },
  "prescriptions": "<2-3 sentence paragraph based on their clinical markers and health status>",
  "screenings": {
    "intro": "<1-2 sentences based on their age and risk factors>",
    "items": [
      {"title": "<screening name>", "body": "<1-2 sentences explaining why for this person>"}
    ]
  }
}"""


def _fmt_sign(value: float) -> str:
    return f"+{value:.1f}" if value >= 0 else f"{value:.1f}"


def build_report_prompts(
    raw_answers: dict,
    features: dict,
    prediction: dict,
    risk_factors: dict,
) -> tuple[str, str]:
    """Return (system_prompt, user_message) for the report generation call."""

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

    # Risk factors
    actionable = risk_factors.get("actionable", [])
    clinical = risk_factors.get("clinical", [])

    risk_lines: list[str] = []
    for r in actionable:
        tag = "HIGH RISK" if r["level"] == "high_risk" else "NEEDS IMPROVEMENT"
        risk_lines.append(f"  • {r['label']} [{tag}]")
    for r in clinical:
        tag = "HIGH RISK" if r["level"] == "high_risk" else "NEEDS IMPROVEMENT"
        risk_lines.append(f"  • {r['label']} [{tag}] (clinical)")
    risk_text = "\n".join(risk_lines) if risk_lines else "  No major risk factors flagged."

    # Identify strengths (low-risk good factors)
    good_keys = {
        "fruitveg_score":       "fruit and vegetable intake",
        "cardio_score":         "cardiovascular exercise",
        "weights_score":        "strength training",
        "sleep_duration_score": "sleep duration",
        "community_time_score": "social connection",
        "support_score":        "social support",
        "screening_score":      "cancer screenings",
        "checkup_score":        "regular checkups",
    }
    strengths = [label for key, label in good_keys.items() if features.get(key, 0) >= 2]
    strengths_text = "\n".join(f"  • {s}" for s in strengths) if strengths else "  None identified yet."

    # Lifestyle answers
    lifestyle_lines: list[str] = []
    hu = raw_answers.get("height_unit")
    hv = raw_answers.get("height_value")
    if hv is not None:
        if hu == "ft_in" and isinstance(hv, list) and len(hv) == 2:
            lifestyle_lines.append(f"  • Height: {hv[0]}ft {hv[1]}in")
        elif hu == "m":
            lifestyle_lines.append(f"  • Height: {hv}m")
        else:
            lifestyle_lines.append(f"  • Height: {hv}cm")
    wv = raw_answers.get("weight_value")
    wu = raw_answers.get("weight_unit", "lb")
    if wv is not None:
        lifestyle_lines.append(f"  • Weight: {wv} {wu}")

    for key, label in _LIFESTYLE_LABELS.items():
        val = raw_answers.get(key)
        if val is not None:
            lifestyle_lines.append(f"  • {label}: {val}")
    lifestyle_text = "\n".join(lifestyle_lines) if lifestyle_lines else "  No data."

    system_prompt = f"""You are a longevity health advisor generating a personalised report for {name}.
You have their complete health profile and a statistically derived life expectancy prediction.
Every section of the report MUST be tailored to {name}'s specific data — reference their actual answers, not generic advice.
NEVER change or invent the prediction numbers.
Return ONLY a valid JSON object matching the schema provided by the user.

PREDICTION:
  • Predicted life expectancy: {death_age:.1f} years (estimated {death_date})
  • Population baseline ({age}-year-old {sex}): {baseline:.1f} years
  • Delta vs. baseline: {_fmt_sign(years_vs)} years
  • Lifestyle score: {lifestyle_score:.0f}/100
  • Estimated years remaining: {remaining:.1f}

PROFILE:
  • Name: {name} | Age: {age} | Sex: {sex} | BMI: {bmi}

RISK FACTORS (areas to address in critical_findings):
{risk_text}

STRENGTHS (areas to highlight in positive_findings):
{strengths_text}

FULL HEALTH DATA:
{lifestyle_text}"""

    user_message = f"""Generate {name}'s complete personalised longevity report as a JSON object.
Reference their specific answers throughout — e.g. if they sit >8 hours, say so explicitly.
Use 2-4 items per section where applicable. Be specific, warm, and evidence-informed.

Return ONLY the following JSON structure with all fields populated:

{_JSON_SCHEMA}"""

    return system_prompt, user_message
