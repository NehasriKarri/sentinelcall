import json
import logging
import sys
from pathlib import Path
from unittest.mock import Mock
import pytest
import requests
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import scam_detector as detector
import main
from sample_transcripts import SAMPLES


@pytest.mark.parametrize("text", ["O T P", "o.t.p.", "oh tee pee", "ओ टी पी", "OTP"])
def test_normalization_and_original_spans(text):
    assert detector.normalize_transcript("  " + text + "!!  ") == "otp"
    result = detector.rule_based_score("Share " + text + " immediately")
    flag = next(f for f in result.flagged if f.category == "otp_or_pin_request")
    assert flag.phrase == text.rstrip(".")
    assert ("Share " + text + " immediately")[flag.start : flag.end] == flag.phrase


@pytest.mark.parametrize("category", list(detector.RULE_CONFIG))
@pytest.mark.parametrize("language", ["en", "hi", "hinglish"])
def test_each_category(category, language):
    examples = {
        "otp_or_pin_request": ["share otp", "ओटीपी बताओ", "otp batao"],
        "impersonation_of_authority": [
            "cyber crime branch",
            "पुलिस से बोल रहे हैं",
            "police se bol rahe hain",
        ],
        "urgency_pressure": ["immediately", "तुरंत करो", "jaldi karo"],
        "payment_or_transfer_request": [
            "transfer money",
            "पैसे भेजो",
            "paisa transfer karo",
        ],
        "threat_of_consequence": ["arrested", "गिरफ्तार हो जाओगे", "arrest ho jaoge"],
        "secrecy_or_isolation": [
            "do not tell anyone",
            "किसी को मत बताना",
            "kisi ko mat batana",
        ],
    }
    assert (
        category
        in detector.rule_based_score(
            examples[category][["en", "hi", "hinglish"].index(language)]
        ).categories
    )


@pytest.mark.parametrize("sample", SAMPLES, ids=lambda s: s.id)
def test_bundled_samples(sample):
    score = detector.analyze(sample.transcript, use_llm=False).risk_score
    assert score >= 65 if sample.label == "scam" else score < 35


@pytest.mark.parametrize("llm_score", [0, 50, 100])
def test_blend(monkeypatch, llm_score):
    monkeypatch.setattr(
        detector,
        "llm_analysis",
        lambda *a: {
            "llm_score": llm_score,
            "explanation": "Context",
            "recommended_action": "Verify",
        },
    )
    result = detector.analyze("OTP immediately")
    assert result.risk_score == max(
        result.rule_score, round(0.4 * result.rule_score + 0.6 * llm_score)
    )


@pytest.mark.parametrize(
    "output",
    [
        {},
        {"llm_score": 101, "explanation": "x", "recommended_action": "x"},
        {"llm_score": "90", "explanation": "x", "recommended_action": "x"},
        None,
    ],
)
def test_bad_schema_falls_back(monkeypatch, output):
    monkeypatch.setattr(detector, "llm_analysis", lambda *a: output)
    result = detector.analyze("OTP immediately")
    assert result.llm_score is None and result.risk_score == result.rule_score


def response(status=200, content="not json"):
    r = Mock()
    r.status_code = status
    r.json.return_value = {"choices": [{"message": {"content": content}}]}
    r.raise_for_status.side_effect = requests.HTTPError() if status >= 400 else None
    return r


def test_invalid_model_and_no_secret_leak(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "private-test-key")
    post = Mock(return_value=response(404))
    monkeypatch.setattr(detector.requests, "post", post)
    result = detector.analyze("OTP")
    assert (
        "GROQ_MODEL" in result.explanation
        and "private-test-key" not in result.explanation
    )
    assert post.call_count == 1


def test_retry_and_configured_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "private-test-key")
    monkeypatch.setenv("GROQ_MODEL", "configured-model")
    post = Mock(
        side_effect=[
            requests.Timeout(),
            response(503),
            response(
                content=json.dumps(
                    {
                        "llm_score": 50,
                        "explanation": "Context",
                        "recommended_action": "Verify",
                    }
                )
            ),
        ]
    )
    monkeypatch.setattr(detector.requests, "post", post)
    sleep = Mock()
    monkeypatch.setattr(detector.time, "sleep", sleep)
    assert detector.analyze("OTP").llm_score == 50
    assert post.call_count == 3 and sleep.call_count == 2
    assert post.call_args.kwargs["json"]["model"] == "configured-model"
    assert post.call_args.kwargs["timeout"] == (3, 10)


def test_malformed_json(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "private-test-key")
    monkeypatch.setattr(detector.requests, "post", lambda *a, **kw: response())
    assert detector.analyze("OTP").llm_score is None


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    main.buckets.clear()
    return TestClient(main.app)


@pytest.mark.parametrize(
    "payload",
    [
        {"transcript": " "},
        {"transcript": "x" * 10001},
        {"transcript": 1},
        {"transcript": "x", "language_hint": "fr"},
        {},
    ],
)
def test_validation(client, payload):
    r = client.post("/analyze", json=payload)
    assert r.status_code == 422 and set(r.json()) == {"error"}
    assert "input" not in r.text


def test_api_and_private_logs(client, caplog):
    with caplog.at_level(logging.INFO, logger="sentinelcall.requests"):
        assert (
            client.post(
                "/analyze",
                json={"transcript": "PRIVATE TRANSCRIPT OTP", "language_hint": "hi"},
            ).status_code
            == 200
        )
    assert "PRIVATE TRANSCRIPT" not in caplog.text
    assert client.get("/health").json() == {"status": "ok"}
    assert len(client.get("/samples").json()) == 5
    assert client.get("/samples/missing").status_code == 404


def test_rate_limit(client, monkeypatch):
    monkeypatch.setattr(main, "LIMIT", 1)
    assert client.post("/analyze", json={"transcript": "hello"}).status_code == 200
    r = client.post("/analyze", json={"transcript": "hello"})
    assert r.status_code == 429 and r.headers["retry-after"] == "60"
    assert client.get("/health").status_code == 200


def test_body_limit(client):
    assert client.post("/analyze", content=b"x" * 128001).status_code == 413
