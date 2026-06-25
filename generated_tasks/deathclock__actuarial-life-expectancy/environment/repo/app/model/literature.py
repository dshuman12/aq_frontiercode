"""Literature-based hazard ratio prediction (Approach A).

Each HR maps to a published study (see source strings).  Combined HR follows
Cox proportional hazards intuition: HR_total ≈ Π HR_i, then raised to 0.65 to
partially correct for correlated risk factors.  Remaining life is scaled from
the SSA baseline; year adjustment is clamped to epidemiologically plausible bounds.

This module matches the death-clock-v2 notebook “Approach A” specification.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any

from .baseline import get_baseline_life_expectancy
from .features import clamp, normalize_questionnaire, resolve_canonical_token

# ── Literature hazard-ratio table (answer token → HR + citation) ──────────────
# Reference category HR = 1.0 per factor where applicable.

LITERATURE_HRS: dict[str, dict[str, dict[str, Any]]] = {
    "nicotine": {
        "never_used":              {"hr": 1.00, "source": "Li 2018 Circulation"},
        "former_user":             {"hr": 1.25, "source": "Li 2018; risk declines ~10yr post-quit"},
        "current_occasional_user": {"hr": 1.56, "source": "Li 2018; 1-14 cigs/day"},
        "current_daily_user":      {"hr": 2.10, "source": "Jha 2013 NEJM; 15+ cigs/day"},
    },
    "alcohol": {
        "dont_drink":                 {"hr": 1.05, "source": "Wood 2018 Lancet; slight J-curve"},
        "1_7_drinks_per_week":        {"hr": 1.00, "source": "Wood 2018; reference (moderate)"},
        "8_14_drinks_per_week":       {"hr": 1.15, "source": "Wood 2018; 100-200g/wk"},
        "15_or_more_drinks_per_week": {"hr": 1.35, "source": "Wood 2018; 350g+/wk"},
    },
    "exercise_cardio": {
        "rarely_or_never":        {"hr": 1.00, "source": "Arem 2015 JAMA IM; reference=inactive"},
        "less_than_150_minutes":  {"hr": 0.80, "source": "Arem 2015; some activity, 20% reduction"},
        "150_to_300_minutes":     {"hr": 0.69, "source": "Arem 2015; meets guidelines"},
        "more_than_300_minutes":  {"hr": 0.63, "source": "Arem 2015; 3-5x guidelines"},
    },
    "exercise_weights": {
        "rarely_or_never":            {"hr": 1.00, "source": "Momma 2022 BJSM; reference"},
        "less_than_once_a_week":      {"hr": 0.95, "source": "Momma 2022; minimal benefit"},
        "one_to_two_days_per_week":   {"hr": 0.85, "source": "Momma 2022; 10-17% reduction"},
        "more_than_two_days_per_week": {"hr": 0.83, "source": "Momma 2022; optimal"},
    },
    "exercise_sitting": {
        "less_than_2_hours":   {"hr": 1.00, "source": "Ekelund 2016 Lancet; reference"},
        "two_to_four_hours":   {"hr": 1.02, "source": "Ekelund 2016"},
        "four_to_eight_hours": {"hr": 1.12, "source": "Ekelund 2016"},
        "more_than_8_hours":   {"hr": 1.27, "source": "Ekelund 2016; 8+ hrs/day"},
    },
    "diet_fruits_veggies": {
        "rarely_or_never":             {"hr": 1.00, "source": "Aune 2017 IJE; reference"},
        "several_times_a_week":        {"hr": 0.92, "source": "Aune 2017; ~200g/day"},
        "daily":                       {"hr": 0.82, "source": "Aune 2017; ~400g/day"},
        "five_or_more_servings_a_day": {"hr": 0.69, "source": "Aune 2017; 800g/day peak"},
    },
    "diet_processed_foods": {
        "rarely_or_never":              {"hr": 1.00, "source": "Lane 2024 BMJ; reference"},
        "once_a_week":                  {"hr": 1.05, "source": "Lane 2024; modest increase"},
        "several_times_a_week_or_more": {"hr": 1.12, "source": "Lane 2024; regular consumption"},
        "daily":                        {"hr": 1.21, "source": "Lane 2024; daily UPF"},
    },
    "diet_sugar": {
        "none":                       {"hr": 1.00, "source": "Huang 2023 BMJ; reference"},
        "just_a_few_treats_a_week":   {"hr": 1.03, "source": "Huang 2023; minimal"},
        "daily_sweet_treat":          {"hr": 1.10, "source": "Huang 2023; moderate"},
        "sweets_several_times_a_day": {"hr": 1.18, "source": "Huang 2023; high sugar"},
    },
    "sleep_duration": {
        "five_or_more_nights_per_week":  {"hr": 1.00, "source": "Cappuccio 2010 Sleep; 7-8h ref"},
        "three_to_four_nights_per_week": {"hr": 1.06, "source": "Cappuccio 2010; moderate deficit"},
        "one_to_two_nights_per_week":    {"hr": 1.12, "source": "Cappuccio 2010; frequent short"},
        "never":                         {"hr": 1.24, "source": "Cappuccio 2010; chronic <6h"},
    },
    "sleep_trouble": {
        "never":                         {"hr": 1.00, "source": "Itani 2017 Sleep Med Rev"},
        "one_to_two_nights_per_week":    {"hr": 1.05, "source": "Itani 2017; occasional"},
        "three_to_four_nights_per_week": {"hr": 1.12, "source": "Itani 2017; frequent"},
        "five_or_more_nights_per_week":  {"hr": 1.20, "source": "Itani 2017; chronic insomnia"},
    },
    "social_support": {
        "not_supportive":        {"hr": 1.00, "source": "Holt-Lunstad 2010 PLOS Med; reference"},
        "slightly_supportive":   {"hr": 0.93, "source": "Holt-Lunstad 2010"},
        "fairly_supportive":     {"hr": 0.86, "source": "Holt-Lunstad 2010"},
        "completely_supportive": {"hr": 0.81, "source": "Holt-Lunstad 2010; strong ties"},
    },
    "community_time": {
        "never":               {"hr": 1.00, "source": "Holt-Lunstad 2015; socially isolated ref"},
        "a_few_times_a_month": {"hr": 0.91, "source": "Holt-Lunstad 2015"},
        "weekly":              {"hr": 0.85, "source": "Holt-Lunstad 2015"},
        "daily":               {"hr": 0.80, "source": "Holt-Lunstad 2015; strong connection"},
    },
    "blood_pressure": {
        "below_120_80_normal":       {"hr": 1.00, "source": "Lewington 2002 Lancet"},
        "i_dont_know":               {"hr": 1.08, "source": "Imputed: population average"},
        "120_80_to_139_89_elevated": {"hr": 1.20, "source": "Lewington 2002; prehypertension"},
        "140_90_or_higher_high":     {"hr": 1.60, "source": "Lewington 2002; stage 2 HTN"},
    },
    "glucose": {
        "below_100_normal":       {"hr": 1.00, "source": "ERFC 2010 Lancet"},
        "i_dont_know":            {"hr": 1.10, "source": "Imputed: population average"},
        "100_125_prediabetes":    {"hr": 1.25, "source": "ERFC 2010; impaired fasting glucose"},
        "126_or_higher_diabetes": {"hr": 1.80, "source": "ERFC 2010; diagnosed diabetes"},
    },
    "ldl": {
        "below_100_optimal":       {"hr": 1.00, "source": "ERFC 2009 Lancet"},
        "i_dont_know":             {"hr": 1.05, "source": "Imputed: population average"},
        "100_159_borderline_high": {"hr": 1.15, "source": "ERFC 2009; borderline"},
        "160_or_higher_high":      {"hr": 1.30, "source": "ERFC 2009; high LDL"},
    },
    "stress": {
        "rarely_or_never":     {"hr": 1.00, "source": "Russ 2012 BMJ"},
        "occasionally":        {"hr": 1.06, "source": "Russ 2012; mild distress"},
        "frequently":          {"hr": 1.21, "source": "Russ 2012; moderate distress"},
        "almost_all_the_time": {"hr": 1.43, "source": "Russ 2012; high psychological distress"},
    },
    "mental_health_impact": {
        "not_at_all": {"hr": 1.00, "source": "Russ 2012 BMJ"},
        "mildly":     {"hr": 1.08, "source": "Russ 2012"},
        "moderately": {"hr": 1.25, "source": "Russ 2012"},
        "severely":   {"hr": 1.50, "source": "Russ 2012; high GHQ score"},
    },
    "chronic_disease": {
        "no":                                {"hr": 1.00, "source": "DuGoff 2014 Med Care"},
        "im_not_sure":                       {"hr": 1.08, "source": "Imputed uncertainty"},
        "risk_factors_for_chronic_diseases": {"hr": 1.25, "source": "DuGoff 2014; risk factors"},
        "yes":                               {"hr": 1.60, "source": "DuGoff 2014; 2+ conditions"},
    },
    "overweight": {
        "no":                  {"hr": 1.00, "source": "GBMC 2016 Lancet; BMI 20-25"},
        "a_little_overweight": {"hr": 1.05, "source": "GBMC 2016; BMI 25-27.5"},
        "overweight":          {"hr": 1.11, "source": "GBMC 2016; BMI 27.5-30"},
        "obese":               {"hr": 1.44, "source": "GBMC 2016; BMI 30-35"},
    },
    "grandparents_max_age": {
        "under_70": {"hr": 1.15, "source": "Dutta 2014; early parental death"},
        "70_79":    {"hr": 1.00, "source": "Dutta 2014; average"},
        "80_89":    {"hr": 0.92, "source": "Dutta 2014; above-average longevity"},
        "90_plus":  {"hr": 0.82, "source": "Murabito 2012; familial longevity"},
    },
    "cancer_screenings": {
        "never":                          {"hr": 1.00, "source": "Liss 2019 Ann IM; reference"},
        "once_or_twice":                  {"hr": 0.97, "source": "Liss 2019; some screening"},
        "sometimes_but_not_consistently": {"hr": 0.94, "source": "Liss 2019; moderate"},
        "as_recommended":                 {"hr": 0.90, "source": "Liss 2019; full adherence"},
    },
    "checkups": {
        "never":                    {"hr": 1.00, "source": "Boulware 2007; reference"},
        "every_five_years":         {"hr": 0.97, "source": "Boulware 2007; infrequent"},
        "every_two_to_three_years": {"hr": 0.95, "source": "Boulware 2007; regular"},
        "yearly":                   {"hr": 0.92, "source": "Boulware 2007; annual"},
    },
}

# Partial confounding correction (notebook Approach A)
CONFOUNDING_EXPONENT = 0.65

# Epidemiological swing limits on year adjustment vs SSA baseline (notebook)
YEAR_ADJUSTMENT_MIN = -15.0
YEAR_ADJUSTMENT_MAX = 12.0

# Hard ceiling on predicted death age (align with prior engine)
MAX_PREDICTED_DEATH_AGE = 97.0


def _lookup_hr(levels: dict[str, dict[str, Any]], token: str | None) -> tuple[float, str, str]:
    """Return (hr, source, matched_key_or_token)."""
    if not token:
        return 1.0, "missing", ""

    if token in levels:
        row = levels[token]
        return float(row["hr"]), str(row.get("source", "")), token

    for k, row in levels.items():
        if k in token or token in k:
            return float(row["hr"]), str(row.get("source", "")), k

    return 1.0, "no match", token


def compute_combined_hr(normalized_answers: dict) -> tuple[float, dict[str, dict[str, Any]]]:
    """Multiply applicable literature HRs.  Returns (product, per-factor breakdown)."""
    combined = 1.0
    breakdown: dict[str, dict[str, Any]] = {}

    for factor_name, levels in LITERATURE_HRS.items():
        raw = normalized_answers.get(factor_name)
        if raw is None:
            continue

        token = resolve_canonical_token(str(raw))
        if token is None:
            continue

        hr, src, matched = _lookup_hr(levels, token)
        breakdown[factor_name] = {
            "answer":       token,
            "matched_key":  matched,
            "hr":           hr,
            "source":       src,
        }
        combined *= hr

    return combined, breakdown


def literature_based_prediction(answers: dict, current_age: int, sex: str) -> dict:
    """SSA baseline + literature HR product (Approach A), notebook-aligned."""
    norm = normalize_questionnaire(answers)

    baseline_remaining = get_baseline_life_expectancy(current_age, sex)
    baseline_death_age = current_age + baseline_remaining

    combined_hr, hr_breakdown = compute_combined_hr(norm)
    effective_hr = combined_hr ** CONFOUNDING_EXPONENT
    adjusted_remaining = baseline_remaining / effective_hr
    year_adjustment = adjusted_remaining - baseline_remaining
    year_adjustment = clamp(year_adjustment, YEAR_ADJUSTMENT_MIN, YEAR_ADJUSTMENT_MAX)

    predicted_death_age = baseline_death_age + year_adjustment
    predicted_death_age = clamp(predicted_death_age, current_age + 1, MAX_PREDICTED_DEATH_AGE)
    remaining_years = predicted_death_age - current_age

    death_date = datetime.now() + timedelta(days=remaining_years * 365.25)

    # Display score: HR>1 worse → negative, HR<1 better → positive
    lifestyle_score = round(-math.log(max(effective_hr, 1e-9)) / 2.0, 3)
    lifestyle_score = clamp(lifestyle_score, -1.0, 1.0)

    return {
        "method":               "approach_a_literature",
        "lifestyle_score":      lifestyle_score,
        "year_adjustment":      round(year_adjustment, 1),
        "remaining_years":      round(remaining_years, 1),
        "predicted_death_age":  round(predicted_death_age, 1),
        "predicted_death_date": death_date.strftime("%B %d, %Y"),
        "baseline_death_age":   round(baseline_death_age, 1),
        "years_vs_baseline":    round(year_adjustment, 1),
        "combined_hr":          round(combined_hr, 4),
        "effective_hr":         round(effective_hr, 4),
        "hr_breakdown":         hr_breakdown,
    }
