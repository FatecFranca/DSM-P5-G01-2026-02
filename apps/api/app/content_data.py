"""Utilitários de texto e licença do conteúdo curado.

O catálogo do app é o banco de questões da Larissa (app/question_bank.py, a partir de bancoquestoesequiz). O antigo
catálogo gerado aqui (Tem em casa, Família e as sete práticas por letra) foi aposentado em 12/11/2026; o seed o marca
como `retired`. O banco de candidatos do corpus (app/data/word_bank.json) nunca entra em exercício sozinho.
"""
import re
import unicodedata

from .content_types import LEARNING_ORDER

ACCENTS = "ÁÉÍÓÚÂÊÔÃÕÀÜÇ"
ASSET_LICENSE = "Projeto Prosa"
ASSET_ATTRIBUTION = "Equipe Projeto Prosa"


def strip_marks(text: str) -> str:
    return "".join(character for character in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(character) != "Mn")


def required_letters(text: str) -> str:
    """Letras necessárias, na ordem de aprendizagem, ignorando acentos e tudo que não é letra."""
    normalized = strip_marks(text)
    return "".join(letter for letter in LEARNING_ORDER if letter in normalized)


def syllable_pattern(syllable: str) -> str:
    """Forma consoante/vogal (CV, CVC, CVVC...). A coluna tem 4 caracteres: formas maiores viram "X"."""
    shape = re.sub(r"[AEIOU]", "V", re.sub(r"[^AEIOU]", "C", strip_marks(syllable)))
    return shape if len(shape) <= 4 else "X"


def deterministic_shuffle(tokens: list[str]) -> list[str]:
    """Ordem estável e diferente da original sempre que houver mais de um arranjo possível."""
    shuffled = sorted(tokens, key=lambda token: (strip_marks(token)[::-1], token))
    if shuffled == tokens and len(set(tokens)) > 1:
        shuffled = tokens[1:] + tokens[:1]
    return shuffled
