"""Offline smoke evaluation: python evaluation/evaluate.py [--threshold 65]."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from scam_detector import analyze

parser = argparse.ArgumentParser()
parser.add_argument("--threshold", type=int, default=65)
args = parser.parse_args()
rows = json.loads(Path(__file__).with_name("transcripts.json").read_text())
tp = fp = fn = tn = 0
for row in rows:
    predicted = analyze(row["transcript"], use_llm=False).risk_score >= args.threshold
    actual = row["label"] == "scam"
    tp += predicted and actual
    fp += predicted and not actual
    fn += not predicted and actual
    tn += not predicted and not actual
print(f"n={len(rows)} threshold={args.threshold} TP={tp} FP={fp} FN={fn} TN={tn}")
print(
    f"Precision: {tp/(tp+fp) if tp+fp else 0:.3f}  Recall: {tp/(tp+fn) if tp+fn else 0:.3f}"
)
