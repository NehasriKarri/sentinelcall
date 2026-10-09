"""
SentinelCall detection engine.

Two layers, combined:

1. Rule-based scorer — deterministic, offline, fast. Looks for known scam
   "tells" (urgency, OTP/PIN requests, impersonation of authority, payment
   pressure, threat of arrest/legal action). This layer alone is testable
   without any API key and gives a reproducible baseline score.

2. LLM reasoning layer — sends the transcript plus the rule-based findings
   to a free Groq-hosted model, which reads the *whole* conversation for
   context a keyword scan misses, and returns a human-readable explanation
   and a refined score.

The final verdict blends both: the rule score anchors the floor (so an
obvious scam can never be waved through by a bad LLM call), and the LLM
score adds nuance on top.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field

import requests
import time
from pydantic import BaseModel, Field, ConfigDict


class LLMOutput(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    llm_score: int = Field(ge=0, le=100)
    explanation: str = Field(min_length=1, max_length=2000)
    recommended_action: str = Field(min_length=1, max_length=1000)


class ReasoningUnavailable(Exception):
    pass


from models import AnalyzeResponse, FlaggedPhrase

ENGLISH_PATTERNS: dict[str, tuple[int, list[str]]] = {
    "otp_or_pin_request": (
        30,
        [r"\botp\b", r"\bpin\b", r"one[\s-]?time password", r"cvv", r"card number"],
    ),
    "impersonation_of_authority": (
        25,
        [
            r"\brbi\b",
            r"reserve bank",
            r"income tax department",
            r"cyber ?crime (cell|branch)",
            r"customs department",
            r"trai\b",
            r"\bcbi\b",
            r"police (station|department)",
            r"digital arrest",
        ],
    ),
    "urgency_pressure": (
        20,
        [
            r"act now",
            r"immediately",
            r"within (\d+ )?(minutes|hours)",
            r"your account will be (blocked|suspended|frozen)",
            r"last warning",
            r"failure to (comply|respond)",
            r"right now",
        ],
    ),
    "payment_or_transfer_request": (
        25,
        [
            r"transfer (the )?(money|amount|funds)",
            r"pay (a |the )?(fine|fee|penalty)",
            r"google pay|gpay|phonepe|paytm|upi id",
            r"gift card",
            r"processing fee",
            r"refundable (deposit|fee)",
        ],
    ),
    "threat_of_consequence": (
        20,
        [
            r"arrest(ed)?",
            r"legal action",
            r"case (will be |gets )?filed",
            r"account (will be |gets )?blocked",
            r"warrant",
            r"court notice",
            r"seize(d)? your",
        ],
    ),
    "secrecy_or_isolation": (
        15,
        [
            r"do not (tell|inform|disclose)",
            r"keep this confidential",
            r"don'?t (hang up|disconnect)",
        ],
    ),
}


@dataclass
class RuleResult:
    score: int
    categories: list[str] = field(default_factory=list)
    flagged: list[FlaggedPhrase] = field(default_factory=list)
    language: str = "en"


def normalize_with_spans(text: str):
    """Return normalized text plus original character spans for safe highlighting."""
    chars, spans = [], []
    for i, char in enumerate(text):
        for lowered in char.lower():
            chars.append(
                lowered
                if lowered.isalnum()
                or lowered in "'"
                or "\u0900" <= lowered <= "\u097f"
                else " "
            )
            spans.append((i, i + 1))
    value = "".join(chars)
    for pattern, replacement in [
        (r"\bo[ .-]*t[ .-]*p\b|\boh\s+tee\s+pee\b|ओ\s*टी\s*पी", "otp"),
        (r"\bp[ .-]+i[ .-]+n\b", "pin"),
        (r"\bc[ .-]+v[ .-]+v\b", "cvv"),
    ]:
        for match in reversed(list(re.finditer(pattern, value))):
            a, b = match.span()
            span = (spans[a][0], spans[b - 1][1])
            value = value[:a] + replacement + value[b:]
            spans[a:b] = [span] * len(replacement)
    chars, mapped = [], []
    for i, char in enumerate(value):
        if char.isspace():
            if not chars or chars[-1] == " ":
                continue
            char = " "
        chars.append(char)
        mapped.append(spans[i])
    if chars and chars[-1] == " ":
        chars.pop()
        mapped.pop()
    return "".join(chars), mapped


def normalize_transcript(text: str) -> str:
    return normalize_with_spans(text)[0]


HINDI_PATTERNS = {
    "otp_or_pin_request": [r"ओटीपी|पिन|सीवीवी|गुप्त कोड", r"otp batao|pin batao"],
    "impersonation_of_authority": [
        r"पुलिस|आरबीआई|सीबीआई|साइबर क्राइम|कस्टम विभाग",
        r"police se|rbi se|cbi se|customs se",
    ],
    "urgency_pressure": [
        r"तुरंत|अभी|जल्दी|आखिरी चेतावनी|खाता बंद",
        r"turant|abhi|jaldi|aakhri chetavani",
    ],
    "payment_or_transfer_request": [
        r"पैसे (भेजो|भेजें|ट्रांसफर)|पैसा ट्रांसफर|जुर्माना|शुल्क",
        r"pais[ae] (transfer karo|bhejo)|paise bheje|jurmana|shulk",
    ],
    "threat_of_consequence": [
        r"गिरफ्तार|गिरफ़्तार|गिरफ्तारी|कानूनी कार्रवाई|वारंट|खाता बंद",
        r"arrest ho jaoge|giraftar|kanooni karwai|khata band",
    ],
    "secrecy_or_isolation": [
        r"किसी को (मत बताना|न बताएं)|गुप्त रख|फोन मत काट",
        r"kisi ko mat bata|gupt rakho|phone mat kaat",
    ],
}
REASONS = {
    "otp_or_pin_request": (
        "Sensitive authentication details are mentioned; never share them with callers.",
        "संवेदनशील सुरक्षा जानकारी का उल्लेख है; कॉल करने वाले को यह न दें।",
    ),
    "impersonation_of_authority": (
        "An authority is mentioned; verify the caller independently.",
        "अधिकारी होने का दावा है; स्वतंत्र रूप से पहचान सत्यापित करें।",
    ),
    "urgency_pressure": (
        "Urgency can pressure you into acting without checking.",
        "जल्दबाजी का दबाव बिना जांचे कदम उठवा सकता है।",
    ),
    "payment_or_transfer_request": (
        "A payment or transfer is mentioned; verify before paying.",
        "भुगतान या ट्रांसफर का उल्लेख है; पहले सत्यापन करें।",
    ),
    "threat_of_consequence": (
        "Threats can be used to induce panic.",
        "धमकी देकर डर पैदा किया जा सकता है।",
    ),
    "secrecy_or_isolation": (
        "Secrecy cuts off advice from people you trust.",
        "गुप्त रखने का दबाव भरोसेमंद लोगों की सलाह से दूर करता है।",
    ),
}
RULE_CONFIG = {
    category: {
        "weight": weight,
        "languages": {
            "en": {"patterns": patterns, "explanation": REASONS[category][0]},
            "hi": {
                "patterns": HINDI_PATTERNS[category],
                "explanation": REASONS[category][1],
            },
        },
    }
    for category, (weight, patterns) in ENGLISH_PATTERNS.items()
}


def rule_based_score(transcript: str, language_hint: str | None = None) -> RuleResult:
    text, spans = normalize_with_spans(transcript)
    total, categories, flagged = 0, [], []
    for category, config in RULE_CONFIG.items():
        matches = []
        for rules in config["languages"].values():
            for pattern in rules["patterns"]:
                matches.extend(re.finditer(pattern, text))
        if not matches:
            continue
        total += config["weight"]
        categories.append(category)
        seen = set()
        for match in matches:
            a, b = spans[match.start()][0], spans[match.end() - 1][1]
            if (a, b) in seen:
                continue
            seen.add((a, b))
            flagged.append(
                FlaggedPhrase(
                    phrase=transcript[a:b],
                    start=a,
                    end=b,
                    category=category,
                    reason=config["languages"][language_hint or "en"]["explanation"],
                )
            )
    return RuleResult(min(total, 100), categories, flagged)


SYSTEM_PROMPT = """You are a scam-call analyst for SentinelCall, a consumer safety tool.
You will be given a call/message transcript and a list of rule-based flags already found.
Read the FULL transcript for context (tone, intent, what is actually being asked for),
not just keywords, then respond with ONLY a JSON object, no prose, no markdown fences:

{
  "llm_score": <int 0-100, your independent estimate of scam likelihood>,
  "explanation": "<2-3 plain-English sentences a non-technical person can understand>",
  "recommended_action": "<one concrete sentence: what should this person do next>"
}

Be careful not to over-flag ordinary calls (e.g. a real bank calling about a genuinely
failed payment, a delivery confirmation, a friend asking for help) as scams just because
they mention money or urgency. Judge intent and context, not just the presence of trigger words.
"""

GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _groq_key() -> str:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Copy .env.example to .env and add your free key "
            "from console.groq.com."
        )
    return api_key


def llm_analysis(transcript: str, rule_result: RuleResult) -> dict:
    api_key = _groq_key()
    user_message = (
        f'Transcript:\n"""\n{transcript}\n"""\n\n'
        f"Rule-based flags already found: {rule_result.categories or 'none'}\n"
        f"Rule-based score: {rule_result.score}/100"
    )

    for attempt in range(3):
        try:
            response = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("GROQ_MODEL", GROQ_MODEL),
                    "messages": [
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT
                            + (
                                " Respond in Hindi."
                                if rule_result.language == "hi"
                                else " Respond in English."
                            ),
                        },
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 700,
                    "response_format": {"type": "json_object"},
                },
                timeout=(3, 10),
            )
            if response.status_code == 404:
                raise ReasoningUnavailable(
                    "Groq model is invalid or unavailable. Check GROQ_MODEL."
                )
            if response.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(0.5 * 2**attempt)
                continue
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return LLMOutput.model_validate_json(content).model_dump()
        except (requests.Timeout, requests.ConnectionError):
            if attempt == 2:
                raise ReasoningUnavailable(
                    "Groq timed out or could not be reached."
                ) from None
            time.sleep(0.5 * 2**attempt)


def _risk_level(score: int) -> str:
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def analyze(
    transcript: str, use_llm: bool = True, language_hint: str | None = None
) -> AnalyzeResponse:
    rule_result = rule_based_score(transcript, language_hint)
    rule_result.language = language_hint or "en"

    llm_score: int | None = None
    explanation = ""
    recommended_action = ""

    if use_llm:
        try:
            llm_out = LLMOutput.model_validate(
                llm_analysis(transcript, rule_result)
            ).model_dump()
            llm_score = int(llm_out.get("llm_score", rule_result.score))
            explanation = llm_out.get("explanation", "")
            recommended_action = llm_out.get("recommended_action", "")
        except Exception as exc:
            detail = (
                str(exc)
                if isinstance(exc, ReasoningUnavailable)
                else "Groq is unavailable or returned invalid data."
            )
            explanation = (
                "AI reasoning unavailable; using pattern matching only. " + detail
            )
            recommended_action = (
                "Treat with caution and verify independently before acting."
                if rule_result.score >= 35
                else "No major red flags detected by pattern matching."
            )

    if llm_score is not None:
        final_score = max(
            rule_result.score, round(0.4 * rule_result.score + 0.6 * llm_score)
        )
    else:
        final_score = rule_result.score
        if not explanation:
            explanation = (
                "Based on pattern matching only (AI reasoning layer not used)."
                if rule_result.score
                else "No known scam patterns detected."
            )
        if not recommended_action:
            recommended_action = (
                "Do not share OTPs, PINs, or make any payment. Verify independently."
                if rule_result.score >= 35
                else "No action needed, but stay alert to requests for money or OTPs."
            )

    if language_hint == "hi" and llm_score is None:
        explanation = (
            "AI विश्लेषण उपलब्ध नहीं है; यह परिणाम केवल नियमों पर आधारित है।"
            if use_llm
            else "यह परिणाम केवल नियमों पर आधारित है।"
        )
        if use_llm and "detail" in locals() and "GROQ_MODEL" in detail:
            explanation += " Groq मॉडल अमान्य या अनुपलब्ध है। GROQ_MODEL जांचें।"
        recommended_action = (
            "OTP, PIN या पैसे न दें। स्वतंत्र रूप से सत्यापन करें।"
            if final_score >= 35
            else "प्रमुख संकेत नहीं मिले; फिर भी सतर्क रहें।"
        )
    return AnalyzeResponse(
        risk_level=_risk_level(final_score),
        risk_score=final_score,
        categories=rule_result.categories,
        flagged_phrases=rule_result.flagged,
        explanation=explanation,
        recommended_action=recommended_action,
        rule_score=rule_result.score,
        llm_score=llm_score,
    )
