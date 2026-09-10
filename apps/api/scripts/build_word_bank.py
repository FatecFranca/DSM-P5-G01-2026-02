"""Gera apps/api/app/data/word_bank.json a partir do Corpus SANTOS TONI.

Uso (a partir de apps/api):
  .\\.venv\\Scripts\\python -m pip install pandas openpyxl pyphen
  .\\.venv\\Scripts\\python scripts/build_word_bank.py
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd
import pyphen

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent.parent
CORPUS = REPO_ROOT / "infra" / "backups" / "Corpus SANTOS TONI_FDC.xlsx"
OUT = API_ROOT / "app" / "data" / "word_bank.json"

LEARNING_ORDER = "AEIOUMLPSTRNDCGBFVHQJKZXWY"
MIN_LEN = 3
MAX_LEN = 12
MIN_FREQ = 10
TARGET = 1200
ACCENT_CHARS = set("ÁÉÍÓÚÂÊÔÃÕÀÜÇ")

# Correções ortográficas de alta confiança (o corpus troca Ê por É em "você").
ORTHO_FIXES = {
    "VOCÉ": "VOCÊ",
}

# Interjeições úteis ao cotidiano; o restante do ruído infantil é descartado.
KEEP_INTERJECTIONS = {"OBRIGADA", "OBRIGADO", "TCHAU", "OI", "OLÁ", "ADEUS", "OPA"}


def strip_marks(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


def is_portuguese_word(text: str) -> bool:
    if not text or not text.isalpha():
        return False
    base = strip_marks(text.upper())
    return all(letter in LEARNING_ORDER for letter in base)


def is_noisy(text: str) -> bool:
    upper = text.upper()
    if re.search(r"(.)\1{2,}", upper):
        return True
    if len(set(strip_marks(upper))) <= 2 and len(upper) >= 5:
        return True
    if re.fullmatch(r"[AEIOUÁÉÍÓÚÂÊÔÃÕÀÜ]+", upper) and len(upper) >= 4:
        return True
    return False


def is_proper_name(category: str) -> bool:
    return category.casefold().startswith("nome pr")


def is_discardable_interjection(category: str, text: str) -> bool:
    if "interje" not in category.casefold():
        return False
    return text.upper() not in KEEP_INTERJECTIONS


def syllabify(text: str, dic: pyphen.Pyphen) -> str:
    inserted = dic.inserted(text.casefold())
    parts = [part.upper() for part in inserted.split("-") if part]
    joined = "-".join(parts) if parts else text.upper()
    # Reaplica acentos da forma original quando o tamanho bate.
    if len(joined.replace("-", "")) == len(text):
        flat = list(text.upper())
        out, i = [], 0
        for ch in joined:
            if ch == "-":
                out.append("-")
            else:
                out.append(flat[i])
                i += 1
        return "".join(out)
    return text.upper()


def consonant_clusters(text: str) -> int:
    base = strip_marks(text.upper())
    vowels = set("AEIOU")
    count = runs = 0
    for ch in base:
        if ch not in vowels:
            runs += 1
            if runs == 2:
                count += 1
        else:
            runs = 0
    return count


def bootstrap_difficulty(text: str, syllables: str, frequency: float) -> str:
    score = syllables.count("-") + 1 + len(text) / 5 + consonant_clusters(text)
    score += 1 if any(ch in ACCENT_CHARS for ch in text.upper()) else 0
    score += max(0.0, 0.5 - frequency)
    return "facil" if score < 3 else "medio" if score < 5 else "dificil"


def build() -> list[dict]:
    if not CORPUS.exists():
        raise FileNotFoundError(f"Corpus não encontrado: {CORPUS}")
    df = pd.read_excel(CORPUS, sheet_name="Plan2")
    dic = pyphen.Pyphen(lang="pt_BR")
    best: dict[str, dict] = {}
    totals: dict[str, int] = defaultdict(int)

    for row in df.itertuples(index=False):
        raw = str(getattr(row, "PALAVRA")).strip()
        freq = int(getattr(row, "FREQ") or 0)
        category = str(getattr(row, "CATMORF") or "")
        if len(raw) < MIN_LEN or len(raw) > MAX_LEN or freq < MIN_FREQ:
            continue
        if not is_portuguese_word(raw) or is_noisy(raw):
            continue
        if is_proper_name(category) or is_discardable_interjection(category, raw):
            continue
        key = strip_marks(raw).casefold()
        totals[key] += freq
        text = raw.upper()
        text = ORTHO_FIXES.get(text, text)
        current = best.get(key)
        if current is None or freq > current["raw_freq"]:
            best[key] = {"text": text, "raw_freq": freq, "category": category}

    ranked = sorted(best.items(), key=lambda item: totals[item[0]], reverse=True)
    max_freq = max((totals[key] for key, _ in ranked[:TARGET]), default=1)
    words: list[dict] = []
    for key, item in ranked[:TARGET]:
        text = item["text"]
        syllables = syllabify(text, dic)
        if len(syllables) > 80:
            continue
        frequency = round(math.log1p(totals[key]) / math.log1p(max_freq), 4)
        words.append({
            "text": text,
            "syllables": syllables,
            "frequency": frequency,
            "raw_frequency": totals[key],
            "difficulty": bootstrap_difficulty(text, syllables, frequency),
            "source": "corpus-santos-toni",
        })
    if len(words) < 1000:
        raise RuntimeError(f"Word bank insuficiente após filtros: {len(words)}")
    return words


def main() -> None:
    words = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(words, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    by_diff: dict[str, int] = defaultdict(int)
    for word in words:
        by_diff[word["difficulty"]] += 1
    print(f"wrote {len(words)} words -> {OUT}")
    print("difficulty", dict(by_diff))
    print("top10", [w["text"] for w in words[:10]])
    print("tail5", [w["text"] for w in words[-5:]], "min_raw_freq", words[-1]["raw_frequency"])


if __name__ == "__main__":
    main()
