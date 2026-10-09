"""Offline evaluation. Holdout mistakes must not be used for rule tuning."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from scam_detector import analyze


def metrics(rows, threshold):
    tp = fp = fn = tn = 0
    errors = []
    for row in rows:
        score = analyze(row["transcript"], use_llm=False).risk_score
        predicted = score >= threshold
        actual = row["label"] == "scam"
        tp += predicted and actual
        fp += predicted and not actual
        fn += not predicted and actual
        tn += not predicted and not actual
        if predicted != actual:
            errors.append(
                (row["id"], row["scenario"], score, "FP" if predicted else "FN")
            )
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    return (
        f"n={len(rows)} TP={tp} FP={fp} FN={fn} TN={tn} precision={precision:.3f} recall={recall:.3f}",
        errors,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--threshold", type=int, default=65)
    parser.add_argument(
        "--split", choices=["development", "heldout"], default="heldout"
    )
    parser.add_argument(
        "--show-errors",
        action="store_true",
        help="Print IDs/scenarios/scores only; never transcript text",
    )
    args = parser.parse_args()
    if not 0 <= args.threshold <= 100:
        parser.error("threshold must be between 0 and 100")
    filename = "transcripts.json" if args.split == "development" else "heldout.json"
    rows = json.loads(Path(__file__).with_name(filename).read_text())
    print(
        f"Synthetic {args.split} set; rules only; threshold={args.threshold}. Not a real-world accuracy estimate."
    )
    summary, errors = metrics(rows, args.threshold)
    print("all: " + summary)
    for language in sorted({r["language"] for r in rows}):
        print(
            language
            + ": "
            + metrics([r for r in rows if r["language"] == language], args.threshold)[0]
        )
    if args.show_errors:
        for row_id, scenario, score, kind in errors:
            print(f"{kind} {row_id} scenario={scenario} score={score}")


if __name__ == "__main__":
    main()
