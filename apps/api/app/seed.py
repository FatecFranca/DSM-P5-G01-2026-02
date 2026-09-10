from sqlalchemy import select
from .db import SessionLocal
from .models import Exercise, Lesson, Module, Word

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
WORDS = [("CASA", "CA-SA", "facil"), ("MALA", "MA-LA", "facil"), ("MESA", "ME-SA", "facil"), ("RUA", "RU-A", "facil"), ("ÔNIBUS", "Ô-NI-BUS", "medio"), ("SAÚDE", "SA-Ú-DE", "medio")]

def seed_content():
    with SessionLocal() as db:
        if db.scalar(select(Module.id).limit(1)): return
        module = Module(id="alphabet", title="Alfabeto", position=1); db.add(module)
        for pos, letter in enumerate(LETTERS, 1):
            lesson = Lesson(id=f"lesson-{letter}", module_id=module.id, letter=letter, title=f"Letra {letter}", position=pos); db.add(lesson)
            specs = [("listen_choose", f"Ouça e escolha a letra {letter}.", [letter, LETTERS[(pos)%26], LETTERS[(pos+1)%26]]), ("recognize_letter", f"Encontre a letra {letter}.", [letter, LETTERS[(pos+2)%26]]), ("write_letter", f"Escreva a letra {letter}.", None)]
            for index, (kind, instruction, options) in enumerate(specs, 1):
                db.add(Exercise(id=f"exercise-{letter}-{kind.replace('_letter','').replace('listen_choose','listen')}", lesson_id=lesson.id, type=kind, instruction=instruction, answer=letter, audio_asset=f"audio/letters/{letter.lower()}-{kind}.mp3", options=options, position=index))
        for text, syllables, difficulty in WORDS:
            db.add(Word(text=text, syllables=syllables, accented=any(c in "ÁÉÍÓÚÂÊÔÃÕÇ" for c in text), length=len(text), frequency=0.5, initial_difficulty=difficulty, current_difficulty=difficulty, classifier_version="bootstrap-1"))
        db.commit()

if __name__ == "__main__": seed_content()
