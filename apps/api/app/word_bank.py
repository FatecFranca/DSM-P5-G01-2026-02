from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

WORD_BANK_PATH = Path(__file__).resolve().parent / "data" / "word_bank.json"


@lru_cache(maxsize=1)
def load_word_bank() -> tuple[dict, ...]:
    if not WORD_BANK_PATH.exists():
        raise FileNotFoundError(
            f"Word bank ausente em {WORD_BANK_PATH}. Gere com: python scripts/build_word_bank.py"
        )
    return tuple(json.loads(WORD_BANK_PATH.read_text(encoding="utf-8")))
