"""Reaplica dificuldades do word bank com o manifesto supervisionado.

Não altera palavras curadas do catálogo pedagógico; só o JSON de candidatos.
Uso:
  python -m alfabetiza_ml.relabel_word_bank --manifest artifacts/difficulty_manifest.json
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from .difficulty import classify_with_model, load_model

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BANK = ROOT.parent / "apps" / "api" / "app" / "data" / "word_bank.json"
DEFAULT_MANIFEST = ROOT / "artifacts" / "difficulty_manifest.json"


def relabel(bank_path: Path, manifest_path: Path) -> dict:
    model = load_model(manifest_path)
    if not model.promotion_allowed:
        raise SystemExit("manifesto sem promotion_allowed; recuse aplicar rótulos")
    words = json.loads(bank_path.read_text(encoding="utf-8"))
    changed = 0
    for entry in words:
        predicted = classify_with_model(model, entry["text"], entry["syllables"], float(entry.get("frequency", 0.5)))
        if entry.get("difficulty") != predicted:
            changed += 1
        entry["difficulty"] = predicted
        entry["difficulty_source"] = f"model:{model.version}"
    bank_path.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"rows": len(words), "changed": changed, "by_difficulty": dict(Counter(entry["difficulty"] for entry in words))}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()
    summary = relabel(args.bank, args.manifest)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
