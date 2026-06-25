"""Normalization helpers and questionnaire → feature engineering."""

import re
from .questionnaire import QUESTIONNAIRE, SCORE_MAPS


def normalize_answer_label(text: str | None) -> str | None:
    """Convert any human-readable answer into a canonical snake_case token.

    Examples:
        "Five or more servings a day" → "five_or_more_servings_a_day"
        "I don't know"               → "i_dont_know"
        "120/80 to 139/89 (elevated)"→ "120_80_to_139_89_elevated"
    """
    if text is None:
        return None
    t = str(text).strip().lower()
    t = t.replace("&", "and")
    t = t.replace("'", "")
    t = t.replace("/", " ")
    t = re.sub(r"[^a-z0-9\s]+", "", t)
    t = re.sub(r"\s+", "_", t).strip("_")
    return t


def normalize_height(value, unit: str) -> float:
    """Convert any height input to meters.

    Args:
        value: number (for cm/m) or [feet, inches] list (for ft_in)
        unit: "cm", "m", or "ft_in"
    """
    unit_norm = normalize_answer_label(unit)
    if unit_norm == "cm":
        return float(value) / 100.0
    if unit_norm == "m":
        return float(value)
    # ft_in normalises to "ftin" after stripping underscores
    if unit_norm in ("ftin", "ft_in", "ft"):
        if isinstance(value, (list, tuple)) and len(value) == 2:
            ft, inch = value
            return (float(ft) * 12.0 + float(inch)) * 0.0254
        # single float in feet
        return float(value) * 0.3048
    raise ValueError(f"Unknown height unit: {unit}")


def normalize_weight(value, unit: str) -> float:
    """Convert any weight input to kilograms."""
    unit = normalize_answer_label(unit)
    if unit == "kg":
        return float(value)
    if unit == "lb":
        return float(value) * 0.45359237
    raise ValueError(f"Unknown weight unit: {unit}")


def compute_bmi(height_m: float, weight_kg: float) -> float:
    """BMI = weight(kg) / height(m)²"""
    if height_m <= 0:
        raise ValueError("Height must be positive")
    return round(weight_kg / (height_m ** 2), 1)


def validate_required_fields(answers: dict) -> bool:
    """Check all required questionnaire fields are present and non-empty."""
    required = [k for k, v in QUESTIONNAIRE.items() if v.get("required", True)]
    missing = [k for k in required if k not in answers or answers[k] in [None, "", []]]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    return True


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _strip_underscores(s: str) -> str:
    """Remove underscores for canonical comparison (foo_bar → foobar)."""
    return s.replace("_", "")


# Display labels that can't round-trip through normalize_answer_label because
# they use digits where the canonical key uses spelled-out words, or contain
# unit strings like "mg/dL" that aren't in the canonical keys.
# Keys are lowercase bare strings (after .lower().strip()).
_DISPLAY_OVERRIDES: dict[str, str] = {
    # Water
    "2 to 5 glasses":                          "two_to_five_glasses",
    "6 to 9 glasses":                          "six_to_nine_glasses",
    "10 or more glasses":                      "ten_or_more_glasses",
    # Alcohol
    "i don't drink":                           "dont_drink",
    "i dont drink":                            "dont_drink",
    # Grandparents
    "90+":                                     "90_plus",
    # LDL cholesterol (frontend shows "mg/dL")
    "below 100 mg/dl (optimal)":               "below_100_optimal",
    "below 100 mg/dl":                         "below_100_optimal",
    "100–159 mg/dl (borderline high)":         "100_159_borderline_high",
    "100-159 mg/dl (borderline high)":         "100_159_borderline_high",
    "100159 mg/dl (borderline high)":          "100_159_borderline_high",
    "160 mg/dl or higher (high to very high)": "160_or_higher_high",
    "160 mg/dl or higher (high)":              "160_or_higher_high",
    # Blood glucose
    "below 100 mg/dl (normal)":                "below_100_normal",
    "below 100 mg/dl":                         "below_100_normal",
    "100–125 mg/dl (prediabetes)":             "100_125_prediabetes",
    "100-125 mg/dl (prediabetes)":             "100_125_prediabetes",
    "126 mg/dl or higher (diabetes)":          "126_or_higher_diabetes",
    # Exercise sitting (en-dash ranges)
    "4–8 hours":                               "four_to_eight_hours",
    "4-8 hours":                               "four_to_eight_hours",
    "2–4 hours":                               "two_to_four_hours",
    "2-4 hours":                               "two_to_four_hours",
    # Exercise mobility (digit-based option label)
    "1–2 times per week":                      "one_to_two_times_per_week",
    "1-2 times per week":                      "one_to_two_times_per_week",
    # Sleep duration (digit-based display labels)
    "1–2 nights per week":                     "one_to_two_nights_per_week",
    "1-2 nights per week":                     "one_to_two_nights_per_week",
    "3–4 nights per week":                     "three_to_four_nights_per_week",
    "3-4 nights per week":                     "three_to_four_nights_per_week",
    "5 or more nights per week":               "five_or_more_nights_per_week",
    # Height units (extra safety)
    "ft_in":                                   "ft_in",
}


def resolve_canonical_token(raw: str | None) -> str | None:
    """Apply display-label overrides (same as score_choice), then snake_case token.

    Use for literature HR lookup so free-text answers match the canonical keys.
    """
    if raw is None:
        return None
    raw_lower = str(raw).strip().lower()
    if raw_lower in _DISPLAY_OVERRIDES:
        raw = _DISPLAY_OVERRIDES[raw_lower]
    return normalize_answer_label(raw)


def score_choice(raw_answer: str, score_map: dict[str, int]) -> int:
    """Convert a raw answer string to its numeric score (0–3).

    Handles both already-canonical keys (once_a_week) and human-readable
    labels ("Once a week") by normalising both sides before comparison.
    Also handles digit-vs-word mismatches via the override table.
    """
    # Check the override table first (case-insensitive)
    raw_lower = str(raw_answer).strip().lower()
    if raw_lower in _DISPLAY_OVERRIDES:
        raw_answer = _DISPLAY_OVERRIDES[raw_lower]

    # Normalise the input, then strip underscores for comparison
    key_norm = normalize_answer_label(raw_answer) or ""
    key_cmp  = _strip_underscores(key_norm)

    # Build a comparison dict with underscore-stripped keys
    stripped_map = {_strip_underscores(k): v for k, v in score_map.items()}

    if key_cmp in stripped_map:
        return stripped_map[key_cmp]

    # Fuzzy fallback: substring match on stripped keys
    for k, v in stripped_map.items():
        if k in key_cmp or key_cmp in k:
            return v

    raise ValueError(
        f"Invalid answer '{raw_answer}' (normalized: '{key_norm}'). "
        f"Valid: {list(score_map.keys())}"
    )


def normalize_questionnaire(answers: dict) -> dict:
    """Clean raw answers → canonical form + compute BMI."""
    validate_required_fields(answers)
    out = dict(answers)
    out["first_name"] = str(answers["first_name"]).strip()
    out["age"]        = int(answers["age"])
    out["sex"]        = normalize_answer_label(answers["sex"])
    out["race"]       = normalize_answer_label(answers["race"])
    out["in_us"]      = bool(answers["in_us"])
    out["height_m"]   = normalize_height(answers["height_value"], answers["height_unit"])
    out["weight_kg"]  = normalize_weight(answers["weight_value"], answers["weight_unit"])
    out["bmi"]        = compute_bmi(out["height_m"], out["weight_kg"])
    return out


_SCORE_FIELD_MAP = {
    "diet_fruits_veggies":  "fruitveg_score",
    "diet_processed_foods": "processed_food_score",
    "diet_sugar":           "sugar_score",
    "diet_water":           "water_score",
    "exercise_cardio":      "cardio_score",
    "exercise_weights":     "weights_score",
    "exercise_mobility":    "stretch_score",
    "exercise_sitting":     "sitting_score",
    "activity_tracking":    "activity_tracking_score",
    "sleep_duration":       "sleep_duration_score",
    "sleep_trouble":        "sleep_disturbance_score",
    "community_time":       "community_time_score",
    "relationship_status":  "relationship_score",
    "children":             "children_score",
    "social_support":       "support_score",
    "household_income":     "income_score",
    "bloodwork_recency":    "bloodwork_score",
    "clinical_data_method": "clinical_data_method_score",
    "alcohol":              "alcohol_score",
    "nicotine":             "nicotine_score",
    "stress":               "stress_score",
    "mental_health_impact": "mental_health_score",
    "checkups":             "checkup_score",
    "cancer_screenings":    "screening_score",
    "grandparents_max_age": "grandparent_longevity_score",
    "overweight":           "overweight_score",
    "blood_pressure":       "bp_score",
    "ldl":                  "ldl_score",
    "glucose":              "glucose_score",
    "chronic_disease":      "chronic_disease_score",
}


def questionnaire_to_features(answers: dict) -> dict:
    """Convert normalized answers → full numeric feature vector.

    Returns a dict with demographics (one-hot), physical measurements,
    and 30 lifestyle/health scores (0–3 scale each).
    """
    a = normalize_questionnaire(answers)

    features: dict = {
        "first_name":    a["first_name"],
        "age":           a["age"],
        "sex_male":      1 if a["sex"] == "male" else 0,
        "sex_female":    1 if a["sex"] == "female" else 0,
        "race_asian":    1 if a["race"] == "asian" else 0,
        "race_black":    1 if a["race"] == "black" else 0,
        "race_hispanic": 1 if a["race"] == "hispanic" else 0,
        "race_ai_an":    1 if a["race"] == "american_indian_alaska_native" else 0,
        "race_white":    1 if a["race"] == "white" else 0,
        "in_us":         1 if a["in_us"] else 0,
        "height_m":      a["height_m"],
        "weight_kg":     a["weight_kg"],
        "bmi":           a["bmi"],
    }

    for q_field, feat_name in _SCORE_FIELD_MAP.items():
        features[feat_name] = score_choice(a[q_field], SCORE_MAPS[q_field])

    return features
