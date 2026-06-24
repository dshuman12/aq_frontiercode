# Task description

The death-clock backend reconstructs remaining life expectancy from an SSA mortality curve in `app/model/baseline.py` via `life_expectancy_from_qx(qx_curve, start_age)`. The current implementation overstates life expectancy because it sums the start-of-year survivor counts `l(x)`, crediting a full year of life even to people who die mid-year.

Rewrite `life_expectancy_from_qx` to use the standard actuarial mid-period correction. For each year, build the survivor count `l(x)`, compute deaths `d(x) = l(x) * q(x)`, and accumulate the mid-period survivor count `L(x) = l(x) - 0.5 * d(x)` (rather than `l(x)`). Divide the accumulated person-years by the initial survivor count to get remaining life expectancy.

Requirements:

- Each `q(x)` must be capped at `1.0` before use, so out-of-range inputs stay well-defined.
- A single fully-fatal year (`q(x) = 1.0`) must yield `0.5` remaining years, not `1.0`. The same holds for any `q(x) >= 1.0` after capping.
- The reconstruction must closely track the published SSA table from `get_baseline_life_expectancy(age, sex)`, staying within a small margin across ages and sexes.
- Life expectancy must remain strictly decreasing with starting age.

Keep the existing signature `life_expectancy_from_qx(qx_curve, start_age)` and the behavior of `get_baseline_qx` and `get_baseline_life_expectancy` unchanged. Do not modify other modules or the prediction pipeline that consumes this function.

# Test guidelines

Run `python -m pytest tests -q` and ensure all tests pass.

Tests live in the `tests` directory. They cover the fully-fatal single-year case (yielding `0.5`), capping of probabilities above `1.0`, agreement with known SSA actuarial values, closeness to the published `e(x)` table across several age/sex pairs, and monotonic decrease of life expectancy with age. Add or extend tests there if you introduce edge cases not already covered, but do not weaken the existing expectations.

# Lint guidelines

Keep imports and helpers tidy; do not introduce unused names. Match the existing type-annotation style used in `baseline.py` (e.g. `list[float]` parameters and a `float` return type).

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
