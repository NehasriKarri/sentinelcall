"""Dataset integrity: the holdout must remain separate from development."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_dataset_split_integrity():
    dev = json.loads((ROOT / "evaluation/transcripts.json").read_text())
    heldout = json.loads((ROOT / "evaluation/heldout.json").read_text())
    assert len(dev) >= 50 and len(heldout) >= 30
    assert not {r["transcript"].strip().lower() for r in dev} & {
        r["transcript"].strip().lower() for r in heldout
    }
    assert len({r["id"] for r in dev + heldout}) == len(dev + heldout)
    for split, rows in [("development", dev), ("heldout", heldout)]:
        assert {r["language"] for r in rows} == {"en", "hi", "hinglish"}
        assert {r["label"] for r in rows} == {"scam", "clean"}
        assert all(
            r["split"] == split and r["source"] == "handwritten synthetic" for r in rows
        )
