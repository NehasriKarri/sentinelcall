"""Request/response schemas for the SentinelCall API."""

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator

RiskLevel = Literal["low", "medium", "high"]


class AnalyzeRequest(BaseModel):
    transcript: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Call or message transcript to analyze",
    )
    use_llm: bool = Field(
        True, strict=True, description="Allow this transcript to be sent to Groq"
    )
    language_hint: Literal["en", "hi"] | None = Field(
        None, description="Optional language of the transcript, e.g. 'en', 'hi'"
    )

    @field_validator("transcript")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Transcript must not be blank")
        return value


class FlaggedPhrase(BaseModel):
    start: int | None = None
    end: int | None = None
    phrase: str
    category: str
    reason: str


class LocalizedExplanation(BaseModel):
    explanation: str
    recommended_action: str


class AnalyzeResponse(BaseModel):
    risk_level: RiskLevel
    risk_score: int = Field(..., ge=0, le=100)
    categories: List[str]
    flagged_phrases: List[FlaggedPhrase]
    explanation: str
    recommended_action: str
    rule_score: int
    llm_score: int | None = None
    llm_status: Literal[
        "used",
        "disabled",
        "missing_key",
        "invalid_model",
        "unavailable",
        "invalid_output",
    ] = "disabled"
    localized: dict[Literal["en", "hi"], LocalizedExplanation] = Field(
        default_factory=dict
    )


class SampleTranscript(BaseModel):
    id: str
    title: str
    label: Literal["scam", "clean"]
    transcript: str
