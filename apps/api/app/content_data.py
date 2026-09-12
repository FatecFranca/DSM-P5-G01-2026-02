"""Catálogo curado à mão (docs/CONTENT_CATALOG_STRATEGY.md).

Toda alteração aqui é curadoria e deve ser registrada em `content_reviews` antes de o item passar a `approved`.
O banco de candidatos gerado do corpus (app/data/word_bank.json) nunca entra em exercício sem passar por este arquivo.
"""
import re
import unicodedata

from .content_types import LEARNING_ORDER, VOWELS

ACCENTS = "ÁÉÍÓÚÂÊÔÃÕÀÜÇ"


def strip_marks(text: str) -> str:
    return "".join(character for character in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(character) != "Mn")


def required_letters(text: str) -> str:
    """Letras necessárias, na ordem de aprendizagem, ignorando acentos e tudo que não é letra."""
    normalized = strip_marks(text)
    return "".join(letter for letter in LEARNING_ORDER if letter in normalized)


def syllable_pattern(syllable: str) -> str:
    shape = re.sub(r"[AEIOU]", "V", re.sub(r"[^AEIOU]", "C", strip_marks(syllable)))
    return shape if shape in {"V", "CV", "CVC", "CCV", "CVV", "VC"} else "outro"


# --- Trilha fônica --------------------------------------------------------------------------------------------------
# find_in_word: a palavra de contexto só usa letras já apresentadas (PEDAGOGICAL_CONTRACT.md). A e E não têm palavra real
# possível e ficam sem esse exercício. I, O, U, M e P foram trocadas em 2026-09-15; revisão pedagógica pendente.
CONTEXT_WORDS = {"I": "AI", "O": "OI", "U": "EU", "M": "MEU", "L": "MALA", "P": "MAPA", "S": "SALA", "T": "PATO", "R": "RUA", "N": "NOME", "D": "DADO", "C": "CASA", "G": "GATO", "B": "BOLA", "F": "FACA", "V": "VACA", "H": "HORA", "Q": "QUILO", "J": "JOGO", "K": "KARATE", "Z": "ZERO", "X": "XALE", "W": "WIFI", "Y": "YOGA"}

# Catálogo explícito das 26 lições. Cada palavra é adulta, concreta e familiar; os pares
# foram curados para que a resposta dependa da relação letra-som/palavra, não da posição.
LESSON_CONTEXT = {
    "A": ("ÁGUA", "MALA", "MALA", "E", "O"), "E": ("ENDEREÇO", "TELEFONE", "ENDEREÇO", "F", "I"),
    "I": ("IDADE", "IDADE", "IDADE", "E", "U"), "O": ("ÔNIBUS", "COPO", "COPO", "Q", "U"),
    "U": ("UNIDADE", "UNIDADE", "UNIDADE", "O", "V"), "M": ("MALA", "CAMA", "MALA", "N", "L"),
    "L": ("LATA", "MALA", "LATA", "I", "T"), "P": ("PORTA", "PAPEL", "PORTA", "B", "R"),
    "S": ("SALA", "SAÚDE", "SALA", "C", "Z"), "T": ("TAPETE", "TETO", "TAPETE", "D", "P"),
    "R": ("RUA", "CARRO", "RUA", "P", "B"), "N": ("NOME", "ÔNIBUS", "NOME", "M", "H"),
    "D": ("DADO", "IDADE", "DADO", "B", "T"), "C": ("CASA", "COPO", "CASA", "G", "S"),
    "G": ("GATO", "ÁGUA", "GATO", "C", "J"), "B": ("BOLA", "ÔNIBUS", "BOLA", "D", "P"),
    "F": ("FACA", "CAFÉ", "FACA", "V", "T"), "V": ("VACA", "CHAVE", "VACA", "F", "B"),
    "H": ("HORA", "SENHA", "HORA", "N", "M"), "Q": ("QUILO", "QUEIJO", "QUILO", "C", "G"),
    "J": ("JOGO", "LOJA", "JOGO", "G", "Z"), "K": ("KARATÊ", "KARATE", "KARATE", "Q", "C"),
    "Z": ("ZERO", "AZUL", "ZERO", "S", "J"), "X": ("XALE", "CAIXA", "XALE", "CH", "Z"),
    "W": ("WI-FI", "WHATSAPP", "WI-FI", "V", "U"), "Y": ("YOGA", "LAYOUT", "YOGA", "I", "J"),
}

VISUAL_DISTRACTORS = {
    "A": ["A", "E", "O"], "E": ["F", "E", "I"], "I": ["L", "I", "T"], "O": ["Q", "O", "C"],
    "U": ["V", "U", "O"], "M": ["N", "M", "W"], "L": ["I", "L", "T"], "P": ["B", "P", "R"],
    "S": ["Z", "S", "C"], "T": ["I", "T", "F"], "R": ["P", "R", "B"], "N": ["M", "N", "H"],
    "D": ["O", "D", "B"], "C": ["G", "C", "O"], "G": ["C", "G", "Q"], "B": ["D", "B", "P"],
    "F": ["E", "F", "T"], "V": ["U", "V", "Y"], "H": ["N", "H", "M"], "Q": ["O", "Q", "G"],
    "J": ["I", "J", "G"], "K": ["X", "K", "R"], "Z": ["S", "Z", "N"], "X": ["K", "X", "Z"],
    "W": ["M", "W", "V"], "Y": ["V", "Y", "I"],
}

# complete_word: (palavra correta, índice da lacuna) e (distrator, índice da lacuna). A lacuna do distrator é de outra letra
# já aprendida e o distrator não contém a letra-alvo. Vogais e M não têm par válido.
WORD_CHOICES = {
    "L": (("MALA", 2), ("UMA", 0)), "P": (("PIPA", 0), ("LAMA", 0)), "S": (("SAPO", 0), ("PIPA", 0)), "T": (("TATU", 0), ("LAMA", 0)),
    "R": (("RATO", 0), ("TATU", 0)), "N": (("NOME", 0), ("MOLA", 0)), "D": (("DADO", 0), ("NOME", 0)), "C": (("CASA", 0), ("DADO", 0)),
    "G": (("GATO", 0), ("SAPO", 0)), "B": (("BOLA", 0), ("CASA", 0)), "F": (("FACA", 0), ("BOLA", 0)), "V": (("VACA", 0), ("GATO", 0)),
    "H": (("HORA", 0), ("TATU", 0)), "Q": (("QUILO", 0), ("BOLA", 0)), "J": (("JOGO", 0), ("DADO", 0)), "K": (("KARATE", 0), ("GATO", 0)),
    "Z": (("ZERO", 0), ("NOME", 0)), "X": (("XALE", 0), ("SALA", 0)), "W": (("WIFI", 0), ("PIPA", 0)), "Y": (("YOGA", 0), ("JOGO", 0)),
}

# syllable_listen_choose: a sílaba consoante+vogal é a unidade audível (o TTS lê "MA", nunca o fonema isolado de M).
# Consoantes cujo padrão CV não forma sílaba regular em português ficam de fora.
SYLLABLE_CONSONANTS = "MLPSTRNDCGBFVZJ"


def syllable_exercise(letter: str) -> tuple[str, list[str]] | None:
    if letter not in SYLLABLE_CONSONANTS:
        return None
    index = SYLLABLE_CONSONANTS.index(letter)
    vowels = VOWELS[index % 5:] + VOWELS[: index % 5]
    target, *rest = (letter + vowel for vowel in vowels)
    # Alterna a posição da resposta entre as lições.
    options = [rest[0], target, rest[1]] if index % 2 else [target, rest[0], rest[1]]
    return target, options


# --- Vocabulário curado --------------------------------------------------------------------------------------------
# (texto, sílabas, dificuldade inicial, justificativa). Status inicial "pending": aguarda revisão pedagógica.
WORDS = [
    ("MALA", ["MA", "LA"], "facil", "duas sílabas CV, letras da fase 2"), ("MAMA", ["MA", "MA"], "facil", "sílaba repetida"),
    ("MESA", ["ME", "SA"], "facil", "duas sílabas CV"), ("SALA", ["SA", "LA"], "facil", "duas sílabas CV"),
    ("PATO", ["PA", "TO"], "facil", "duas sílabas CV"), ("RUA", ["RU", "A"], "facil", "sílaba CV + vogal"),
    ("NOME", ["NO", "ME"], "facil", "duas sílabas CV"), ("GATO", ["GA", "TO"], "facil", "duas sílabas CV"),
    ("CASA", ["CA", "SA"], "facil", "duas sílabas CV"), ("CAMA", ["CA", "MA"], "facil", "duas sílabas CV"),
    ("COPO", ["CO", "PO"], "facil", "duas sílabas CV"), ("LATA", ["LA", "TA"], "facil", "duas sílabas CV"),
    ("PRATO", ["PRA", "TO"], "medio", "encontro consonantal PR"), ("PORTA", ["POR", "TA"], "medio", "sílaba CVC"),
    ("PANELA", ["PA", "NE", "LA"], "medio", "três sílabas CV"), ("TAPETE", ["TA", "PE", "TE"], "medio", "três sílabas CV"),
    ("ÔNIBUS", ["Ô", "NI", "BUS"], "medio", "acento e sílaba CVC"), ("SAÚDE", ["SA", "Ú", "DE"], "medio", "hiato com acento"),
]

# --- Trilhas temáticas -----------------------------------------------------------------------------------------------
# A trilha agrupa; o portão é `required_letters` de cada unidade (letras de todas as palavras/frases da unidade).
SENTENCES = [
    {"id": "casa-frase-1", "text": "EU DURMO NA CAMA", "blank": "CAMA", "distractors": ["COPO", "PORTA"]},
    {"id": "casa-frase-2", "text": "O COPO ESTÁ NA MESA", "blank": "COPO", "distractors": ["CAMA", "PORTA"]},
    {"id": "casa-frase-3", "text": "EU COMO NO PRATO", "blank": "PRATO", "distractors": ["CAMA", "PORTA"]},
    {"id": "casa-frase-4", "text": "A SALA É GRANDE", "order": True},
    {"id": "casa-frase-5", "text": "A CASA TEM UMA PORTA", "order": True},
]
TRACKS = [
    {"id": "casa", "slug": "tem-em-casa", "title": "Tem em casa", "kind": "theme", "position": 2,
     "description": "Palavras e frases das coisas que existem em casa.",
     "units": [
         {"id": "casa-1", "kind": "word", "title": "Coisas da casa", "words": ["CASA", "MESA", "CAMA", "SALA"]},
         {"id": "casa-2", "kind": "word", "title": "Mais coisas da casa", "words": ["COPO", "PRATO", "PORTA", "PANELA", "TAPETE"]},
         {"id": "casa-frases", "kind": "sentence", "title": "Frases da casa", "sentences": ["casa-frase-1", "casa-frase-2", "casa-frase-3", "casa-frase-4", "casa-frase-5"]},
     ]},
]


def deterministic_shuffle(tokens: list[str]) -> list[str]:
    """Ordem estável e diferente da original sempre que houver mais de um arranjo possível."""
    shuffled = sorted(tokens, key=lambda token: (strip_marks(token)[::-1], token))
    if shuffled == tokens and len(set(tokens)) > 1:
        shuffled = tokens[1:] + tokens[:1]
    return shuffled
