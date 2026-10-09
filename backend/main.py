"""Run from backend/: uvicorn main:app --reload --port 8000."""

import os
import time
import logging
from collections import OrderedDict, deque
from threading import Lock
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from models import AnalyzeRequest, AnalyzeResponse, SampleTranscript
from sample_transcripts import SAMPLES, get_sample
from scam_detector import analyze

app = FastAPI(title="SentinelCall API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
logger = logging.getLogger("sentinelcall.requests")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())
LIMIT = max(1, int(os.getenv("RATE_LIMIT_PER_MINUTE", "30")))
buckets = OrderedDict()
lock = Lock()


def error(status, code, message, headers=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Never echo input values, which can contain private transcripts.
    return error(
        422,
        "validation_error",
        "Provide a nonblank transcript of at most 10000 characters and language_hint en or hi.",
    )


@app.exception_handler(StarletteHTTPException)
async def http_error(request, exc):
    return error(exc.status_code, "http_error", str(exc.detail))


@app.middleware("http")
async def protect_and_log(request: Request, call_next):
    started = time.monotonic()
    response = None
    try:
        if request.method == "POST" and request.url.path == "/analyze":
            # Bound the body before JSON parsing, even without Content-Length.
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 128000:
                    response = error(
                        413, "body_too_large", "Request body is too large."
                    )
                    break
            if response is None:
                request._body = bytes(body)
                key = request.client.host if request.client else "unknown"
                with lock:
                    now = time.monotonic()
                    queue = buckets.pop(key, deque())
                    while queue and queue[0] <= now - 60:
                        queue.popleft()
                    limited = len(queue) >= LIMIT
                    if not limited:
                        queue.append(now)
                    buckets[key] = queue
                    while len(buckets) > 10000:
                        buckets.popitem(last=False)
                if limited:
                    response = error(
                        429,
                        "rate_limited",
                        "Too many checks. Please wait a minute.",
                        {"Retry-After": "60"},
                    )
        if response is None:
            response = await call_next(request)
    except Exception:
        response = error(
            500, "internal_error", "Something went wrong. Please try again."
        )
    # Fixed route label only: no body, query string, IP, secret, or arbitrary URL.
    route = request.scope.get("route")
    logger.info(
        "method=%s route=%s status=%s duration_ms=%.0f",
        request.method,
        getattr(route, "path", "unmatched"),
        response.status_code,
        (time.monotonic() - started) * 1000,
    )
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/samples", response_model=list[SampleTranscript])
def list_samples():
    return SAMPLES


@app.get("/samples/{sample_id}", response_model=SampleTranscript)
def sample(sample_id: str):
    result = get_sample(sample_id)
    if result is None:
        raise HTTPException(404, "Sample not found")
    return result


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_transcript(request: AnalyzeRequest):
    return analyze(
        request.transcript, use_llm=request.use_llm, language_hint=request.language_hint
    )
