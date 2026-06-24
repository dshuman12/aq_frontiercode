"""Pydantic request/response schemas for the Death Clock API."""

from pydantic import BaseModel, Field
from typing import Any


class PredictRequest(BaseModel):
    answers: dict[str, Any] = Field(
        ...,
        description="Full questionnaire answers. Keys match the QUESTIONNAIRE schema.",
        examples=[{
            "first_name": "Amani",
            "age": 20,
            "sex": "male",
            "race": "black",
            "in_us": True,
            "height_value": [5, 10],
            "height_unit": "ft_in",
            "weight_value": 165,
            "weight_unit": "lb",
            "diet_fruits_veggies": "daily",
            "diet_processed_foods": "once_a_week",
            "diet_sugar": "just_a_few_treats_a_week",
            "diet_water": "six_to_nine_glasses",
            "exercise_cardio": "150_to_300_minutes",
            "exercise_weights": "one_to_two_days_per_week",
            "exercise_mobility": "a_few_times_a_month",
            "exercise_sitting": "four_to_eight_hours",
            "activity_tracking": "yes_tracking_both",
            "sleep_duration": "five_or_more_nights_per_week",
            "sleep_trouble": "one_to_two_nights_per_week",
            "community_time": "weekly",
            "relationship_status": "single",
            "children": "no_and_not_planning_to",
            "social_support": "fairly_supportive",
            "household_income": "under_75k",
            "bloodwork_recency": "eager_to_get_blood_work_done_soon",
            "clinical_data_method": "none_of_the_above",
            "alcohol": "1_7_drinks_per_week",
            "nicotine": "never_used",
            "stress": "occasionally",
            "mental_health_impact": "mildly",
            "checkups": "yearly",
            "cancer_screenings": "as_recommended",
            "grandparents_max_age": "80_89",
            "overweight": "no",
            "blood_pressure": "below_120_80_normal",
            "ldl": "i_dont_know",
            "glucose": "below_100_normal",
            "chronic_disease": "no",
        }]
    )


class WhatIfRequest(BaseModel):
    answers: dict[str, Any] = Field(..., description="Base questionnaire answers.")
    overrides: dict[str, Any] = Field(
        ...,
        description="Fields to change for the hypothetical scenario.",
        examples=[{"nicotine": "never_used", "exercise_cardio": "more_than_300_minutes"}]
    )


class VitalityParams(BaseModel):
    y0: float
    zeta: float
    sigma: float
    lambda_jump: float


class Prediction(BaseModel):
    lifestyle_score: float
    year_adjustment: float
    remaining_years: float
    predicted_death_age: float
    predicted_death_date: str
    baseline_death_age: float
    years_vs_baseline: float
    # Approach A (literature HR) — optional for backward compatibility
    method: str | None = None
    combined_hr: float | None = None
    effective_hr: float | None = None
    hr_breakdown: dict[str, Any] | None = None


class PredictResponse(BaseModel):
    features: dict[str, Any]
    vitality_params: VitalityParams
    prediction: Prediction


class RiskFactor(BaseModel):
    label: str
    score: int
    level: str


class ExplainResponse(BaseModel):
    features: dict[str, Any]
    vitality_params: VitalityParams
    prediction: Prediction
    risk_factors: dict[str, list[RiskFactor]]
    retrieval_queries: list[str]
    instructions: str


class WhatIfResponse(BaseModel):
    base: PredictResponse
    hypothetical: PredictResponse
    delta_years: float
    changed_fields: list[str]


class ReportMilestone(BaseModel):
    title: str
    body: str
    done: bool

class ReportItem(BaseModel):
    title: str
    body: str

class ReportItemNextStep(BaseModel):
    title: str
    body: str
    next_step: str
    status: str

class ReportItemGoal(BaseModel):
    title: str
    body: str
    goal: str

class ReportItemFrequency(BaseModel):
    title: str
    body: str
    evidence: str
    frequency: str

class ReportItemHow(BaseModel):
    title: str
    body: str
    evidence: str
    how: str

class ReportStep(BaseModel):
    title: str
    body: str

class LongevityReport(BaseModel):
    # All fields have defaults so a partial LLM response never causes a 422
    your_journey:        dict[str, Any] = Field(default_factory=dict)
    progress_and_trends: str = ""
    critical_findings:   dict[str, Any] = Field(default_factory=dict)
    positive_findings:   dict[str, Any] = Field(default_factory=dict)
    doctor_topics:       dict[str, Any] = Field(default_factory=dict)
    hormone_analysis:    str = ""
    genetics:            str = ""
    roadmap:             dict[str, Any] = Field(default_factory=dict)
    behavioral_goals:    dict[str, Any] = Field(default_factory=dict)
    diet:                dict[str, Any] = Field(default_factory=dict)
    supplements:         dict[str, Any] = Field(default_factory=dict)
    devices:             dict[str, Any] = Field(default_factory=dict)
    prescriptions:       str = ""
    screenings:          dict[str, Any] = Field(default_factory=dict)


class ReportRequest(BaseModel):
    answers: dict[str, Any] = Field(..., description="Full questionnaire answers.")


class ReportResponse(BaseModel):
    report: LongevityReport


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    answers: dict[str, Any] = Field(..., description="Full questionnaire answers.")
    messages: list[ChatMessage] = Field(..., description="Conversation history including the latest user message.")


class ChatResponse(BaseModel):
    reply: str
