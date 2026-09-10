import unicodedata
from sqlalchemy import select
from .db import SessionLocal
from .models import Exercise, Lesson, Module, Word

LETTERS = "AEIOUMLPSTRNDCGBFVHQJKZXWY"
PHASES = {letter: (1, "Vogais") for letter in "AEIOU"} | {letter: (2, "Consoantes de alta utilidade") for letter in "MLPSTRNDCG"} | {letter: (3, "Ampliação do vocabulário") for letter in "BFVHQJKZXWY"}
WORDS = [("MALA", "MA-LA", "facil"), ("MAMA", "MA-MA", "facil"), ("MESA", "ME-SA", "facil"), ("SALA", "SA-LA", "facil"), ("PATO", "PA-TO", "facil"), ("RUA", "RU-A", "facil"), ("NOME", "NO-ME", "facil"), ("GATO", "GA-TO", "facil"), ("CASA", "CA-SA", "facil"), ("ÔNIBUS", "Ô-NI-BUS", "medio"), ("SAÚDE", "SA-Ú-DE", "medio")]
CONTEXT_WORDS = {"A": "MALA", "E": "MESA", "I": "PIPA", "O": "NOME", "U": "RUA", "M": "MALA", "L": "MALA", "P": "PATO", "S": "SALA", "T": "PATO", "R": "RUA", "N": "NOME", "D": "DADO", "C": "CASA", "G": "GATO", "B": "BOLA", "F": "FACA", "V": "VACA", "H": "HORA", "Q": "QUILO", "J": "JOGO", "K": "KARATE", "Z": "ZERO", "X": "XALE", "W": "WIFI", "Y": "YOGA"}

def required_letters(text: str) -> str:
    normalized = "".join(character for character in unicodedata.normalize("NFD", text.upper()) if unicodedata.category(character) != "Mn")
    return "".join(letter for letter in LETTERS if letter in normalized)

def find_exercise(letter: str, position: int):
    word = CONTEXT_WORDS[letter]
    first_position = word.index(letter) + 1
    options = [f"{item + 1}ª posição" for item in range(len(word))]
    return ("find_in_word", f"Onde aparece primeiro a letra {letter} na palavra {word}?", options, f"{first_position}ª posição", word)

def seed_content():
    with SessionLocal() as db:
        existing_module = db.scalar(select(Module).where(Module.id == "alphabet"))
        if existing_module:
            for lesson in db.scalars(select(Lesson).where(Lesson.module_id == existing_module.id)).all():
                if lesson.letter in PHASES:
                    lesson.position = LETTERS.index(lesson.letter) + 1
                    lesson.phase, lesson.phase_title = PHASES[lesson.letter]
                existing_find = db.scalar(select(Exercise).where(Exercise.lesson_id == lesson.id, Exercise.type == "find_in_word"))
                if not existing_find:
                    kind, instruction, options, answer, context_word = find_exercise(lesson.letter, lesson.position)
                    db.add(Exercise(id=f"exercise-{lesson.letter}-find", lesson_id=lesson.id, type=kind, instruction=instruction, answer=answer, audio_asset=f"audio/letters/{lesson.letter.lower()}-find.mp3", options=options, context_word=context_word, position=3))
            for word in db.scalars(select(Word)).all():
                word.required_letters = required_letters(word.text)
            existing_words = {word.text for word in db.scalars(select(Word)).all()}
            for text, syllables, difficulty in WORDS:
                if text not in existing_words:
                    db.add(Word(text=text, syllables=syllables, required_letters=required_letters(text), accented=any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in text), length=len(text), frequency=0.5, initial_difficulty=difficulty, current_difficulty=difficulty, classifier_version="bootstrap-1"))
            db.commit()
            return
        module = Module(id="alphabet", title="Alfabeto", position=1); db.add(module)
        for pos, letter in enumerate(LETTERS, 1):
            phase, phase_title = PHASES[letter]
            lesson = Lesson(id=f"lesson-{letter}", module_id=module.id, letter=letter, title=f"Letra {letter}", position=pos, phase=phase, phase_title=phase_title); db.add(lesson)
            find_kind, find_instruction, find_options, find_answer, context_word = find_exercise(letter, pos)
            specs = [("listen_choose", f"Ouça e escolha a letra {letter}.", [letter, LETTERS[(pos)%26], LETTERS[(pos+1)%26]], None, None), ("recognize_letter", f"Encontre a letra {letter}.", [letter, LETTERS[(pos+2)%26]], None, None), (find_kind, find_instruction, find_options, find_answer, context_word)]
            for index, (kind, instruction, options, answer, context_word) in enumerate(specs, 1):
                db.add(Exercise(id=f"exercise-{letter}-{kind.replace('_letter','').replace('listen_choose','listen')}", lesson_id=lesson.id, type=kind, instruction=instruction, answer=answer or letter, audio_asset=f"audio/letters/{letter.lower()}-{kind}.mp3", options=options, context_word=context_word, position=index))
        for text, syllables, difficulty in WORDS:
            db.add(Word(text=text, syllables=syllables, required_letters=required_letters(text), accented=any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in text), length=len(text), frequency=0.5, initial_difficulty=difficulty, current_difficulty=difficulty, classifier_version="bootstrap-1"))
        db.commit()

if __name__ == "__main__": seed_content()
