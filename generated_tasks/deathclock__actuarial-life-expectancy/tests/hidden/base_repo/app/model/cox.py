"""Cox Proportional Hazards — baseline adjustment utilities.

The full Cox model requires NHANES data (see notebook Section 7).
This module provides the hazard-ratio adjustment function that can be
applied once the model is trained, plus a stub for the training pipeline.
"""

from .features import clamp


def apply_cox_hazard_ratio(
    baseline_qx: list[float],
    hazard_ratio: float,
    start_age: int,
) -> list[float]:
    """Modify a baseline mortality curve using a Cox hazard ratio.

    Formula: q_adjusted(x) = 1 - (1 - q_baseline(x))^HR

    Age-attenuation weakens the HR effect past age 60 because at very old
    ages mortality converges across risk groups.
    """
    adjusted: list[float] = []
    for i, qx in enumerate(baseline_qx):
        age = start_age + i
        if age < 60:
            effective_hr = hazard_ratio
        elif age > 95:
            effective_hr = 1.0 + (hazard_ratio - 1.0) * 0.15
        else:
            t = (age - 60) / 35.0
            effective_hr = 1.0 + (hazard_ratio - 1.0) * (1.0 - t * 0.85)

        adjusted_qx = clamp(1.0 - (1.0 - qx) ** effective_hr, 0.0, 1.0)
        adjusted.append(adjusted_qx)
    return adjusted


def fit_cox_model(df, duration_col: str = "permth_exm", event_col: str = "mortstat", feature_cols: list | None = None):
    """Fit a Cox PH model on NHANES data.

    Requires: pip install lifelines
    Download NHANES data to /raw/ before running.
    """
    from lifelines import CoxPHFitter

    if feature_cols is None:
        feature_cols = [c for c in df.columns if c not in [duration_col, event_col, "SEQN"]]

    model_df = df[[duration_col, event_col] + feature_cols].dropna()
    cph = CoxPHFitter(penalizer=0.01)
    cph.fit(model_df, duration_col=duration_col, event_col=event_col)
    return cph
