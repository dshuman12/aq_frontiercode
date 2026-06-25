"""Vitality model: converts feature vector into a life expectancy prediction.

Models health as a vitality score that drifts downward over time.
Death is predicted when vitality hits zero.

    y(t) = y₀ + ζt + σW(t) + jumps

| Parameter      | Meaning                                       |
|----------------|-----------------------------------------------|
| y₀             | Initial vitality — how healthy you are now    |
| ζ (zeta)       | Drift rate — speed of decline (always ≤ 0)   |
| σ (sigma)      | Volatility — trajectory uncertainty           |
| λ (lambda_jump)| Jump hazard — probability of health shocks    |

Max swing anchored to Li et al. 2018 Circulation
(5 vs 0 healthy factors ≈ 14-year gap).
"""

import math
from datetime import datetime, timedelta
from .baseline import get_baseline_life_expectancy
from .features import clamp
from .literature import literature_based_prediction


def features_to_vitality_params(f: dict) -> dict:
    """Convert numeric feature vector to vitality model parameters."""

    # ── y0: Initial vitality ──
    y0 = 100.0
    y0 -= 0.6 * max(f["age"] - 40, 0)
    y0 -= 5.0 * (max(f["bmi"] - 25, 0) / 5.0)
    y0 += 3.0 * f["grandparent_longevity_score"]
    y0 -= 4.0 * f["bp_score"]
    y0 -= 4.0 * f["ldl_score"]
    y0 -= 5.0 * f["glucose_score"]
    y0 -= 5.0 * f["chronic_disease_score"]
    y0 -= 3.0 * f["overweight_score"]
    y0 = max(y0, 10.0)

    # ── ζ: Drift rate (always negative) ──
    zeta = -1.0
    # Good factors slow the decline
    zeta += 0.05 * f["fruitveg_score"]
    zeta += 0.08 * f["cardio_score"]
    zeta += 0.05 * f["weights_score"]
    zeta += 0.03 * f["stretch_score"]
    zeta += 0.05 * f["sleep_duration_score"]
    zeta += 0.03 * f["water_score"]
    zeta += 0.02 * f["checkup_score"]
    zeta += 0.02 * f["screening_score"]
    zeta += 0.03 * f["community_time_score"]
    zeta += 0.02 * f["relationship_score"]
    zeta += 0.02 * f["support_score"]
    # Bad factors accelerate decline
    zeta -= 0.08 * f["processed_food_score"]
    zeta -= 0.07 * f["sugar_score"]
    zeta -= 0.08 * f["sitting_score"]
    zeta -= 0.08 * f["sleep_disturbance_score"]
    zeta -= 0.10 * f["bp_score"]
    zeta -= 0.10 * f["ldl_score"]
    zeta -= 0.12 * f["glucose_score"]
    zeta -= 0.12 * f["chronic_disease_score"]
    zeta -= 0.06 * f["stress_score"]
    zeta -= 0.05 * f["mental_health_score"]
    zeta = min(zeta, -0.05)

    # ── σ: Volatility ──
    sigma = 1.0
    sigma += 0.2 * f["stress_score"]
    sigma -= 0.1 * f["support_score"]
    sigma = max(0.5, sigma)

    # ── λ: Jump hazard ──
    lambda_jump = 0.01
    lambda_jump += 0.02 * f["alcohol_score"]
    lambda_jump += 0.03 * f["nicotine_score"]
    lambda_jump -= 0.01 * f["screening_score"]
    lambda_jump -= 0.005 * f["checkup_score"]
    lambda_jump = max(0.0, lambda_jump)

    return {
        "y0":          round(y0, 2),
        "zeta":        round(zeta, 4),
        "sigma":       round(sigma, 2),
        "lambda_jump": round(lambda_jump, 4),
    }


def vitality_to_prediction(
    params: dict,
    current_age: int,
    sex: str,
    answers: dict | None = None,
) -> dict:
    """Convert vitality parameters into a life expectancy prediction.

    When ``answers`` are provided (main API pipeline), uses Approach A:
    literature-anchored hazard ratios + SSA baseline (see ``literature.py``).
    Vitality params are still returned for transparency but do not set the
    headline predicted death age.

    Falls back to the legacy vitality formula only if ``answers`` is omitted.
    """
    if answers is not None:
        return literature_based_prediction(answers, current_age, sex)

    # ── Legacy vitality fallback (no questionnaire supplied) ───────────────
    y0   = params["y0"]
    zeta = params["zeta"]
    lam  = params["lambda_jump"]

    baseline_remaining = get_baseline_life_expectancy(current_age, sex)
    baseline_death_age = current_age + baseline_remaining

    AVERAGE_Y0   = 78.0
    AVERAGE_ZETA = -1.0

    y0_delta        = (y0 - AVERAGE_Y0) / AVERAGE_Y0
    zeta_delta      = (AVERAGE_ZETA - zeta) / abs(AVERAGE_ZETA)
    lifestyle_score = 0.4 * y0_delta - 0.6 * zeta_delta

    MAX_BONUS   = 12.0
    MAX_PENALTY = 15.0

    if lifestyle_score >= 0:
        year_adjustment = MAX_BONUS * (1 - math.exp(-1.5 * lifestyle_score))
    else:
        year_adjustment = -MAX_PENALTY * (1 - math.exp(1.2 * lifestyle_score))

    if lam > 0.03:
        year_adjustment -= min((lam - 0.01) * 30, 5.0)

    predicted_death_age = clamp(baseline_death_age + year_adjustment, current_age + 1, 97)
    remaining_years     = predicted_death_age - current_age
    death_date          = datetime.now() + timedelta(days=remaining_years * 365.25)

    return {
        "lifestyle_score":      round(lifestyle_score, 3),
        "year_adjustment":      round(year_adjustment, 1),
        "remaining_years":      round(remaining_years, 1),
        "predicted_death_age":  round(predicted_death_age, 1),
        "predicted_death_date": death_date.strftime("%B %d, %Y"),
        "baseline_death_age":   round(baseline_death_age, 1),
        "years_vs_baseline":    round(year_adjustment, 1),
    }
