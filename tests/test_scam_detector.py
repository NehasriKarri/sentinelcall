"""
Tests for the rule-based layer of scam_detector.

These run fully offline and require no ANTHROPIC_API_KEY, so they're safe
to run in CI. The LLM layer is exercised separately (see test_analyze_live.py)
and is skipped automatically when no key is present.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from scam_detector import rule_based_score, analyze  # noqa: E402


def test_clean_transcript_scores_low():
    result = rule_based_score(
        "Hi, this is Ramesh from the delivery service. I'm outside your building."
    )
    assert result.score == 0
    assert result.categories == []


def test_otp_request_is_flagged():
    result = rule_based_score("Please share the OTP sent to your phone to verify your account.")
    assert "otp_or_pin_request" in result.categories
    assert result.score >= 30


def test_digital_arrest_scam_scores_high():
    transcript = (
        "This is Officer Sharma from Cyber Crime Branch. You are under digital arrest. "
        "Transfer your savings immediately or a case will be filed and you will be arrested."
    )
    result = rule_based_score(transcript)
    assert result.score >= 65
    assert "impersonation_of_authority" in result.categories
    assert "threat_of_consequence" in result.categories


def test_analyze_without_llm_falls_back_gracefully():
    response = analyze(
        "Share your CVV and OTP immediately or your account will be blocked within 2 hours.",
        use_llm=False,
    )
    assert response.risk_level in ("medium", "high")
    assert response.rule_score > 0
    assert response.llm_score is None
    assert response.explanation


def test_analyze_clean_call_without_llm():
    response = analyze(
        "Hey, are we still on for lunch tomorrow at 1pm?",
        use_llm=False,
    )
    assert response.risk_level == "low"
    assert response.rule_score == 0
