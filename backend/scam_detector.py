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

from models import AnalyzeResponse, FlaggedPhrase

RULE_PATTERNS: dict[str, tuple[int, list[str]]] = {
    "otp_or_pin_request": (
        30,
        [r"\botp\b", r"\bpin\b", r"one[\s-]?time password", r"cvv", r"card number"],
    ),
    "impersonation_of_authority": (
        25,
        [
            r"\brbi\b", r"reserve bank", r"income tax department", r"cyber ?crime (cell|branch)",
            r"customs department", r"trai\b", r"\bcbi\b", r"police (station|department)",
            r"digital arrest",
        ],
    ),
    "urgency_pressure": (
        20,
        [
            r"act now", r"immediately", r"within (\d+ )?(minutes|hours)", r"your account will be (blocked|suspended|frozen)",
            r"last warning", r"failure to (comply|respond)", r"right now",
        ],
    ),
    "payment_or_transfer_request": (
        25,
        [
            r"transfer (the )?(money|amount|funds)", r"pay (a |the )?(fine|fee|penalty)",
            r"google pay|gpay|phonepe|paytm|upi id", r"gift card", r"processing fee",
            r"refundable (deposit|fee)",
        ],
    ),
    "threat_of_consequence": (
        20,
        [
            r"arrest(ed)?", r"legal action", r"case (will be |gets )?filed", r"account (will be |gets )?blocked",
            r"warrant", r"court notice", r"seize(d)? your",
        ],
    ),
    "secrecy_or_isolation": (
        15,
        [r"do not (tell|inform|disclose)", r"keep this confidential", r"don'?t (hang up|disconnect)"],
    ),
}


@dataclass
class RuleResult:
    score: int
    categories: list[str] = field(default_factory=list)
    flagged: list[FlaggedPhrase] = field(default_factory=list)


def rule_based_score(transcript: str) -> RuleResult:
    text = transcript.lower()
    total = 0
    categories: list[str] = []
    flagged: list[FlaggedPhrase] = []

    for category, (weight, patterns) in RULE_PATTERNS.items():
        hit = False
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                hit = True
                flagged.append(
                    FlaggedPhrase(
                        phrase=match.group(0),
                        category=category,
                        reason=_category_reason(category),
                    )
                )
                break
        if hit:
            total += weight
            categories.append(category)

    return RuleResult(score=min(total, 100), categories=categories, flagged=flagged)


def _category_reason(category: str) -> str:
    return {
        "otp_or_pin_request": "Legitimate banks and government bodies never ask for OTP, PIN, or CVV over a call.",
        "impersonation_of_authority": "Claims to be a government or law-enforcement body — a common scam script.",
        "urgency_pressure": "Manufactured urgency is used to stop the target from thinking it through.",
        "payment_or_transfer_request": "Asks for money, a fee, or a transfer — the actual goal of most scams.",
        "threat_of_consequence": "Threatens arrest or legal action to induce panic and compliance.",
        "secrecy_or_isolation": "Asks the target to keep the call secret, cutting off outside advice.",
    }.get(category, "Matches a known scam pattern.")


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

GROQ_MODEL = "openai/gpt-oss-120b"
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
        f"Transcript:\n\"\"\"\n{transcript}\n\"\"\"\n\n"
        f"Rule-based flags already found: {rule_result.categories or 'none'}\n"
        f"Rule-based score: {rule_result.score}/100"
    )

    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=20,
    )
    response.raise_for_status()
    text = response.json()["choices"][0]["message"]["content"].strip()
    text = re.sub(r"^```json|```$", "", text, flags=re.MULTILINE).strip()
    return json.loads(text)


def _risk_level(score: int) -> str:
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def analyze(transcript: str, use_llm: bool = True) -> AnalyzeResponse:
    rule_result = rule_based_score(transcript)

    llm_score: int | None = None
    explanation = ""
    recommended_action = ""

    if use_llm:
        try:
            llm_out = llm_analysis(transcript, rule_result)
            llm_score = int(llm_out.get("llm_score", rule_result.score))
            explanation = llm_out.get("explanation", "")
            recommended_action = llm_out.get("recommended_action", "")
        except Exception as exc:
            explanation = (
                "AI reasoning layer was unavailable, so this verdict is based on "
                f"rule-based pattern matching only. ({exc})"
            )
            recommended_action = (
                "Treat with caution and verify independently before acting."
                if rule_result.score >= 35
                else "No major red flags detected by pattern matching."
            )

    if llm_score is not None:
        final_score = max(rule_result.score, round(0.4 * rule_result.score + 0.6 * llm_score))
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
