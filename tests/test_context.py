"""Regressions for context, privacy choices and bilingual API results."""

import sys
from pathlib import Path
from unittest.mock import Mock
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import scam_detector as detector
from models import AnalyzeRequest


@pytest.mark.parametrize(
    "text",
    [
        "Never share your OTP with anyone.",
        "Your OTP expires in ten minutes.",
        "Your PIN was changed successfully.",
        "Google Pay is supported at our store.",
        "Do not share your OTP immediately with unknown callers.",
        "किसी को अपना ओटीपी मत बताओ।",
        "OTP kisi ko mat batana.",
        "Please contact the police station to report this.",
    ],
)
def test_benign_mentions_and_advice(text):
    assert detector.rule_based_score(text).score == 0


@pytest.mark.parametrize(
    "text",
    [
        "Never share your OTP, but tell me your PIN immediately.",
        "Never share your OTP. Tell me your PIN immediately.",
        "OTP mat batao, lekin pin batao abhi.",
        "ओटीपी मत बताओ। पिन बताओ अभी।",
    ],
)
def test_advice_cannot_hide_later_demand(text):
    result = detector.rule_based_score(text)
    assert "otp_or_pin_request" in result.categories
    assert "urgency_pressure" in result.categories


def test_secrecy_is_not_misread_as_safety_advice():
    assert (
        "secrecy_or_isolation"
        in detector.rule_based_score("Do not tell anyone about this call.").categories
    )


def test_disabled_ai_never_calls_provider(monkeypatch):
    provider = Mock(side_effect=AssertionError("Should not send transcript"))
    monkeypatch.setattr(detector, "llm_analysis", provider)
    result = detector.analyze("Share OTP immediately", use_llm=False)
    assert result.llm_status == "disabled"
    provider.assert_not_called()
    assert set(result.localized) == {"en", "hi"}
    assert "AI" in result.localized["en"].explanation
    assert "नियम" in result.localized["hi"].explanation


def test_missing_key_status(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert detector.analyze("Hello").llm_status == "missing_key"


def test_bilingual_ai_contract(monkeypatch):
    monkeypatch.setattr(
        detector,
        "llm_analysis",
        lambda *a: {
            "llm_score": 80,
            "explanation": "The caller demands a secret.",
            "recommended_action": "Verify independently.",
            "explanation_hi": "कॉल करने वाला गुप्त जानकारी मांगता है।",
            "recommended_action_hi": "स्वतंत्र रूप से सत्यापन करें।",
        },
    )
    result = detector.analyze("Hello", language_hint="hi")
    assert (
        result.llm_status == "used"
        and result.explanation == result.localized["hi"].explanation
    )
    assert result.localized["en"].explanation == "The caller demands a secret."


def test_missing_translation_fails_closed(monkeypatch):
    monkeypatch.setattr(
        detector,
        "llm_analysis",
        lambda *a: {"llm_score": 80, "explanation": "x", "recommended_action": "x"},
    )
    assert detector.analyze("Hello").llm_status == "invalid_output"


def test_use_llm_requires_a_boolean():
    with pytest.raises(ValueError):
        AnalyzeRequest(transcript="x", use_llm="false")
