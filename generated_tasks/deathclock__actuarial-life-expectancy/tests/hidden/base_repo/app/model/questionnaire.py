"""Questionnaire schema definition and answer score maps.

Mirrors the iOS frontend's 29-question survey exactly.
"""

QUESTIONNAIRE = {
    # ── Demographics ──
    "first_name":    {"type": "str",   "required": True, "max_length": 60},
    "age":           {"type": "int",   "required": True, "min": 18, "max": 120},
    "sex":           {"type": "enum",  "required": True, "values": ["male", "female"]},
    "race": {
        "type": "enum",
        "required": True,
        "values": ["asian", "black", "hispanic", "american_indian_alaska_native", "white"],
    },
    "in_us":         {"type": "bool",  "required": True},
    "height_value":  {"type": "float", "required": True, "min": 0.5, "max": 250.0},
    "height_unit":   {"type": "enum",  "required": True, "values": ["cm", "ft_in", "m"]},
    "weight_value":  {"type": "float", "required": True, "min": 20.0, "max": 500.0},
    "weight_unit":   {"type": "enum",  "required": True, "values": ["kg", "lb"]},

    # ── Diet ──
    "diet_fruits_veggies": {
        "type": "enum", "required": True,
        "values": ["rarely_or_never", "several_times_a_week", "daily", "five_or_more_servings_a_day"],
    },
    "diet_processed_foods": {
        "type": "enum", "required": True,
        "values": ["daily", "several_times_a_week_or_more", "once_a_week", "rarely_or_never"],
    },
    "diet_sugar": {
        "type": "enum", "required": True,
        "values": ["sweets_several_times_a_day", "daily_sweet_treat", "just_a_few_treats_a_week", "none"],
    },
    "diet_water": {
        "type": "enum", "required": True,
        "values": ["less_than_one_glass", "two_to_five_glasses", "six_to_nine_glasses", "ten_or_more_glasses"],
    },

    # ── Exercise ──
    "exercise_cardio": {
        "type": "enum", "required": True,
        "values": ["rarely_or_never", "less_than_150_minutes", "150_to_300_minutes", "more_than_300_minutes"],
    },
    "exercise_weights": {
        "type": "enum", "required": True,
        "values": ["rarely_or_never", "less_than_once_a_week", "one_to_two_days_per_week", "more_than_two_days_per_week"],
    },
    "exercise_mobility": {
        "type": "enum", "required": True,
        "values": ["never", "a_few_times_a_month", "one_to_two_times_per_week", "three_or_more_times_per_week"],
    },
    "exercise_sitting": {
        "type": "enum", "required": True,
        "values": ["more_than_8_hours", "four_to_eight_hours", "two_to_four_hours", "less_than_2_hours"],
    },

    # ── Activity Tracking ──
    "activity_tracking": {
        "type": "enum", "required": True,
        "values": ["yes_tracking_both", "only_tracking_activity", "only_tracking_sleep", "no_not_using_any_device"],
    },

    # ── Sleep ──
    "sleep_duration": {
        "type": "enum", "required": True,
        "values": ["never", "one_to_two_nights_per_week", "three_to_four_nights_per_week", "five_or_more_nights_per_week"],
    },
    "sleep_trouble": {
        "type": "enum", "required": True,
        "values": ["five_or_more_nights_per_week", "three_to_four_nights_per_week", "one_to_two_nights_per_week", "never"],
    },

    # ── Community ──
    "community_time": {
        "type": "enum", "required": True,
        "values": ["never", "a_few_times_a_month", "weekly", "daily"],
    },
    "relationship_status": {
        "type": "enum", "required": True,
        "values": ["in_a_long_term_relationship", "married", "single", "divorced_widowed_separated"],
    },
    "children": {
        "type": "enum", "required": True,
        "values": ["yes_not_living_at_home", "yes_living_at_home", "no_but_planning_to", "no_and_not_planning_to"],
    },
    "social_support": {
        "type": "enum", "required": True,
        "values": ["not_supportive", "slightly_supportive", "fairly_supportive", "completely_supportive"],
    },

    # ── Health Planning ──
    "household_income": {
        "type": "enum", "required": True,
        "values": ["under_75k", "75k_200k", "200k_500k", "over_500k"],
    },
    "bloodwork_recency": {
        "type": "enum", "required": True,
        "values": [
            "eager_to_get_blood_work_done_soon",
            "got_blood_work_recently_will_keep_doing_it",
            "rarely_get_blood_work_done_dont_see_a_need",
            "avoid_blood_work",
        ],
    },
    "clinical_data_method": {
        "type": "enum", "required": True,
        "values": ["upload_blood_work_or_lab_results", "sync_my_medical_records", "both_upload_and_sync", "none_of_the_above"],
    },

    # ── Substance Use ──
    "alcohol": {
        "type": "enum", "required": True,
        "values": ["15_or_more_drinks_per_week", "8_14_drinks_per_week", "1_7_drinks_per_week", "dont_drink"],
    },
    "nicotine": {
        "type": "enum", "required": True,
        "values": ["current_daily_user", "current_occasional_user", "former_user", "never_used"],
    },

    # ── Mental Health ──
    "stress": {
        "type": "enum", "required": True,
        "values": ["almost_all_the_time", "frequently", "occasionally", "rarely_or_never"],
    },
    "mental_health_impact": {
        "type": "enum", "required": True,
        "values": ["severely", "moderately", "mildly", "not_at_all"],
    },

    # ── Healthcare ──
    "checkups": {
        "type": "enum", "required": True,
        "values": ["never", "every_five_years", "every_two_to_three_years", "yearly"],
    },
    "cancer_screenings": {
        "type": "enum", "required": True,
        "values": ["never", "once_or_twice", "sometimes_but_not_consistently", "as_recommended"],
    },

    # ── Family History ──
    "grandparents_max_age": {
        "type": "enum", "required": True,
        "values": ["under_70", "70_79", "80_89", "90_plus"],
    },

    # ── Disease / Clinical ──
    "overweight": {
        "type": "enum", "required": True,
        "values": ["obese", "overweight", "a_little_overweight", "no"],
    },
    "blood_pressure": {
        "type": "enum", "required": True,
        "values": ["below_120_80_normal", "i_dont_know", "120_80_to_139_89_elevated", "140_90_or_higher_high"],
    },
    "ldl": {
        "type": "enum", "required": True,
        "values": ["below_100_optimal", "i_dont_know", "100_159_borderline_high", "160_or_higher_high"],
    },
    "glucose": {
        "type": "enum", "required": True,
        "values": ["below_100_normal", "i_dont_know", "100_125_prediabetes", "126_or_higher_diabetes"],
    },
    "chronic_disease": {
        "type": "enum", "required": True,
        "values": ["yes", "risk_factors_for_chronic_diseases", "im_not_sure", "no"],
    },
}

SCORE_MAPS: dict[str, dict[str, int]] = {
    "diet_fruits_veggies": {
        "rarely_or_never": 0, "several_times_a_week": 1,
        "daily": 2, "five_or_more_servings_a_day": 3,
    },
    "diet_processed_foods": {
        "daily": 3, "several_times_a_week_or_more": 2,
        "once_a_week": 1, "rarely_or_never": 0,
    },
    "diet_sugar": {
        "sweets_several_times_a_day": 3, "daily_sweet_treat": 2,
        "just_a_few_treats_a_week": 1, "none": 0,
    },
    "diet_water": {
        "less_than_one_glass": 0, "two_to_five_glasses": 1,
        "six_to_nine_glasses": 2, "ten_or_more_glasses": 3,
    },
    "exercise_cardio": {
        "rarely_or_never": 0, "less_than_150_minutes": 1,
        "150_to_300_minutes": 2, "more_than_300_minutes": 3,
    },
    "exercise_weights": {
        "rarely_or_never": 0, "less_than_once_a_week": 1,
        "one_to_two_days_per_week": 2, "more_than_two_days_per_week": 3,
    },
    "exercise_mobility": {
        "never": 0, "a_few_times_a_month": 1,
        "one_to_two_times_per_week": 2, "three_or_more_times_per_week": 3,
    },
    "exercise_sitting": {
        "more_than_8_hours": 3, "four_to_eight_hours": 2,
        "two_to_four_hours": 1, "less_than_2_hours": 0,
    },
    "activity_tracking": {
        "yes_tracking_both": 3, "only_tracking_activity": 2,
        "only_tracking_sleep": 1, "no_not_using_any_device": 0,
    },
    "sleep_duration": {
        "never": 0, "one_to_two_nights_per_week": 1,
        "three_to_four_nights_per_week": 2, "five_or_more_nights_per_week": 3,
    },
    "sleep_trouble": {
        "five_or_more_nights_per_week": 3, "three_to_four_nights_per_week": 2,
        "one_to_two_nights_per_week": 1, "never": 0,
    },
    "community_time": {
        "never": 0, "a_few_times_a_month": 1, "weekly": 2, "daily": 3,
    },
    "relationship_status": {
        "single": 0, "divorced_widowed_separated": 1,
        "in_a_long_term_relationship": 3, "married": 3,
    },
    "children": {
        "no_and_not_planning_to": 0, "no_but_planning_to": 1,
        "yes_living_at_home": 1, "yes_not_living_at_home": 2,
    },
    "social_support": {
        "not_supportive": 0, "slightly_supportive": 1,
        "fairly_supportive": 2, "completely_supportive": 3,
    },
    "household_income": {
        "under_75k": 0, "75k_200k": 1, "200k_500k": 2, "over_500k": 3,
    },
    "bloodwork_recency": {
        "avoid_blood_work": 0, "eager_to_get_blood_work_done_soon": 0,
        "rarely_get_blood_work_done_dont_see_a_need": 1,
        "got_blood_work_recently_will_keep_doing_it": 3,
    },
    "clinical_data_method": {
        "none_of_the_above": 0, "upload_blood_work_or_lab_results": 1,
        "sync_my_medical_records": 1, "both_upload_and_sync": 2,
    },
    "alcohol": {
        "dont_drink": 0, "1_7_drinks_per_week": 1,
        "8_14_drinks_per_week": 2, "15_or_more_drinks_per_week": 3,
    },
    "nicotine": {
        "never_used": 0, "former_user": 1,
        "current_occasional_user": 2, "current_daily_user": 3,
    },
    "stress": {
        "rarely_or_never": 0, "occasionally": 1,
        "frequently": 2, "almost_all_the_time": 3,
    },
    "mental_health_impact": {
        "not_at_all": 0, "mildly": 1, "moderately": 2, "severely": 3,
    },
    "checkups": {
        "never": 0, "every_five_years": 1,
        "every_two_to_three_years": 2, "yearly": 3,
    },
    "cancer_screenings": {
        "never": 0, "once_or_twice": 1,
        "sometimes_but_not_consistently": 2, "as_recommended": 3,
    },
    "grandparents_max_age": {
        "under_70": 0, "70_79": 1, "80_89": 2, "90_plus": 3,
    },
    "overweight": {
        "no": 0, "a_little_overweight": 1, "overweight": 2, "obese": 3,
    },
    "blood_pressure": {
        "below_120_80_normal": 0, "i_dont_know": 1,
        "120_80_to_139_89_elevated": 2, "140_90_or_higher_high": 3,
    },
    "ldl": {
        "below_100_optimal": 0, "i_dont_know": 1,
        "100_159_borderline_high": 2, "160_or_higher_high": 3,
    },
    "glucose": {
        "below_100_normal": 0, "i_dont_know": 1,
        "100_125_prediabetes": 2, "126_or_higher_diabetes": 3,
    },
    "chronic_disease": {
        "no": 0, "im_not_sure": 1,
        "risk_factors_for_chronic_diseases": 2, "yes": 3,
    },
}
