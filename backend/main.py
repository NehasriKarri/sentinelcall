"""SentinelCall API.

Run with:
    uvicorn main:app --reload --port 8000
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from models import AnalyzeRequest, AnalyzeResponse, SampleTranscript
from sample_transcripts import SAMPLES, get_sample
from scam_detector import analyze

app = FastAPI(
    title="SentinelCall API",
    description="Detects scam calls/messages from a transcript using rule-based heuristics + Claude.",
    version="1.0.0",
)

# Wide-open CORS for hackathon/demo purposes. Lock this down before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/samples", response_model=list[SampleTranscript])
def list_samples() -> list[SampleTranscript]:
    return SAMPLES


@app.get("/samples/{sample_id}", response_model=SampleTranscript)
def get_sample_by_id(sample_id: str) -> SampleTranscript:
    sample = get_sample(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_transcript(request: AnalyzeRequest) -> AnalyzeResponse:
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript must not be empty")
    return analyze(request.transcript)
