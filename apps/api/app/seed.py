import unicodedata
from sqlalchemy import select
from .content_ids import exercise_id_for, lesson_id_for
from .content_types import EXERCISE_ID_SUFFIX, LEARNING_ORDER, PHASE_SPECS, ExerciseType
from .db import SessionLocal
from .models import Exercise, Lesson, Module, Word
from .word_bank import load_word_bank

LETTERS = LEARNING_ORDER
PHASES = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}
# Núcleo pedagógico curado; prevalece sobre o corpus quando houver conflito.
CURATED_WORDS = [
    ("MALA", "MA-LA", "facil"), ("MAMA", "MA-MA", "facil"), ("MESA", "ME-SA", "facil"), ("SALA", "SA-LA", "facil"),
    ("PATO", "PA-TO", "facil"), ("RUA", "RU-A", "facil"), ("NOME", "NO-ME", "facil"), ("GATO", "GA-TO", "facil"),
    ("CASA", "CA-SA", "facil"), ("PIPA", "PI-PA", "facil"), ("DADO", "DA-DO", "facil"), ("DATA", "DA-TA", "facil"),
    ("CAMA", "CA-MA", "facil"), ("LATA", "LA-TA", "facil"), ("SAPO", "SA-PO", "facil"), ("RATO", "RA-TO", "facil"),
    ("BOLA", "BO-LA", "facil"), ("BALA", "BA-LA", "facil"), ("FACA", "FA-CA", "facil"), ("VACA", "VA-CA", "facil"),
    ("FILA", "FI-LA", "facil"), ("HORA", "HO-RA", "facil"), ("JOGO", "JO-GO", "facil"), ("ZERO", "ZE-RO", "facil"),
    ("XALE", "XA-LE", "facil"), ("YOGA", "YO-GA", "facil"), ("QUILO", "QUI-LO", "medio"), ("KARATE", "KA-RA-TE", "medio"),
    ("WIFI", "WI-FI", "medio"), ("ÔNIBUS", "Ô-NI-BUS", "medio"), ("SAÚDE", "SA-Ú-DE", "medio"), ("ÁGUA", "Á-GUA", "medio"),
    ("PAÍS", "PA-ÍS", "medio"), ("TRABALHO", "TRA-BA-LHO", "dificil"),
]
WORDS = CURATED_WORDS
# find_in_word: a palavra de contexto só usa letras já apresentadas (PEDAGOGICAL_CONTRACT.md:23).
# I, O, U, M e P foram trocadas em 2026-09-15 por violarem essa regra; revisão pedagógica pendente.
CONTEXT_WORDS = {"I": "AI", "O": "OI", "U": "EU", "M": "MEU", "L": "MALA", "P": "MAPA", "S": "SALA", "T": "PATO", "R": "RUA", "N": "NOME", "D": "DADO", "C": "CASA", "G": "GATO", "B": "BOLA", "F": "FACA", "V": "VACA", "H": "HORA", "Q": "QUILO", "J": "JOGO", "K": "KARATE", "Z": "ZERO", "X": "XALE", "W": "WIFI", "Y": "YOGA"}
# complete_word: (palavra correta, índice da lacuna) e (distrator, índice da lacuna). A lacuna do distrator é de outra letra
# já aprendida e o distrator não contém a letra-alvo. Vogais e M não têm par válido. Revisão pedagógica pendente.
WORD_CHOICES = {
    "L": (("MALA", 2), ("UMA", 0)), "P": (("PIPA", 0), ("LAMA", 0)), "S": (("SAPO", 0), ("PIPA", 0)), "T": (("TATU", 0), ("LAMA", 0)),
    "R": (("RATO", 0), ("TATU", 0)), "N": (("NOME", 0), ("MOLA", 0)), "D": (("DADO", 0), ("NOME", 0)), "C": (("CASA", 0), ("DADO", 0)),
    "G": (("GATO", 0), ("SAPO", 0)), "B": (("BOLA", 0), ("CASA", 0)), "F": (("FACA", 0), ("BOLA", 0)), "V": (("VACA", 0), ("GATO", 0)),
    "H": (("HORA", 0), ("TATU", 0)), "Q": (("QUILO", 0), ("BOLA", 0)), "J": (("JOGO", 0), ("DADO", 0)), "K": (("KARATE", 0), ("GATO", 0)),
    "Z": (("ZERO", 0), ("NOME", 0)), "X": (("XALE", 0), ("SALA", 0)), "W": (("WIFI", 0), ("PIPA", 0)), "Y": (("YOGA", 0), ("JOGO", 0)),
}

def required_letters(text: str) -> str:
    normalized = "".join(character for character in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(character) != "Mn")
    return "".join(letter for letter in LETTERS if letter in normalized)

def word_choice(word: str, blank: int) -> dict:
    return {"id": word.lower(), "word": word, "before": word[:blank], "after": word[blank + 1:]}

def catalog_words() -> list[tuple[str, str, str, float, str]]:
    """Corpus filtrado + núcleo curado (curado vence em sílabas/dificuldade)."""
    merged: dict[str, tuple[str, str, str, float, str]] = {}
    for item in load_word_bank():
        merged[item["text"]] = (item["text"], item["syllables"], item["difficulty"], float(item["frequency"]), "corpus-bootstrap-1")
    for text, syllables, difficulty in CURATED_WORDS:
        frequency = merged.get(text, (None, None, None, 0.85, None))[3]
        merged[text] = (text, syllables, difficulty, frequency, "bootstrap-1")
    return list(merged.values())

def exercise_specs(letter: str):
    """(tipo, enunciado, resposta, opções, palavra de contexto, opções de palavra) de cada exercício da lição."""
    index = LETTERS.index(letter)
    options = [letter, LETTERS[(index + 1) % 26], LETTERS[(index + 2) % 26]]
    specs = [(ExerciseType.LISTEN_CHOOSE, f"Ouça e escolha a letra {letter}.", letter, options, None, None),
             (ExerciseType.RECOGNIZE_LETTER, f"Encontre a letra {letter}.", letter, options[::-1], None, None)]
    if word := CONTEXT_WORDS.get(letter):
        specs.append((ExerciseType.FIND_IN_WORD, f"Onde aparece primeiro a letra {letter} na palavra {word}?", f"{word.index(letter) + 1}ª posição", [f"{item + 1}ª posição" for item in range(len(word))], word, None))
    if letter in WORD_CHOICES:
        (correct, correct_blank), (distractor, distractor_blank) = WORD_CHOICES[letter]
        choices = [word_choice(correct, correct_blank), word_choice(distractor, distractor_blank)]
        # Alterna a posição da resposta para que ela não fique sempre em primeiro.
        specs.append((ExerciseType.COMPLETE_WORD, f"Em qual palavra entra a letra {letter}?", correct.lower(), None, None, choices[::-1] if index % 2 else choices))
    return specs

def seed_content():
    """Sincroniza o banco com o catálogo declarado aqui: cria, atualiza e remove exercícios obsoletos. Idempotente."""
    with SessionLocal() as db:
        module = db.get(Module, "alphabet") or Module(id="alphabet")
        module.title, module.position = "Alfabeto", 1
        db.add(module)
        for position, letter in enumerate(LETTERS, 1):
            lesson = db.get(Lesson, lesson_id_for(letter)) or Lesson(id=lesson_id_for(letter))
            lesson.module_id, lesson.letter, lesson.title, lesson.position = module.id, letter, f"Letra {letter}", position
            lesson.phase, lesson.phase_title = PHASES[letter]
            db.add(lesson)
            wanted = set()
            for order, (kind, instruction, answer, options, context_word, word_choices) in enumerate(exercise_specs(letter), 1):
                exercise = db.get(Exercise, exercise_id_for(letter, kind)) or Exercise(id=exercise_id_for(letter, kind))
                exercise.lesson_id, exercise.type, exercise.instruction, exercise.answer, exercise.position = lesson.id, kind.value, instruction, answer, order
                exercise.options, exercise.context_word, exercise.word_choices = options, context_word, word_choices
                exercise.audio_asset = f"audio/letters/{letter.lower()}-{EXERCISE_ID_SUFFIX[kind]}.mp3"
                db.add(exercise)
                wanted.add(exercise.id)
            for stale in db.scalars(select(Exercise).where(Exercise.lesson_id == lesson.id, Exercise.id.not_in(wanted))).all():
                db.delete(stale)
        words = {word.text: word for word in db.scalars(select(Word)).all()}
        wanted_texts = set()
        for text, syllables, difficulty, frequency, classifier_version in catalog_words():
            wanted_texts.add(text)
            if text not in words:
                words[text] = Word(
                    text=text,
                    syllables=syllables,
                    frequency=frequency,
                    initial_difficulty=difficulty,
                    current_difficulty=difficulty,
                    classifier_version=classifier_version,
                    accented=any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in text),
                    length=len(text),
                    required_letters=required_letters(text),
                )
                db.add(words[text])
            words[text].syllables = syllables
            words[text].frequency = frequency
            words[text].initial_difficulty = difficulty
            words[text].current_difficulty = difficulty
            words[text].classifier_version = classifier_version
        for stale in [word for text, word in list(words.items()) if text not in wanted_texts]:
            db.delete(stale)
        for word in db.scalars(select(Word)).all():
            word.required_letters = required_letters(word.text)
            word.accented = any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in word.text)
            word.length = len(word.text)
        db.commit()

if __name__ == "__main__": seed_content()
