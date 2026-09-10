"""Regras pedagógicas verificáveis sobre o corpo de /v1/content.

O mobile aplica as mesmas regras ao bundle baixado antes de substituí-lo; o export do bundle semente também.
"""
import unicodedata

from .content_types import required_types_for


def letters_of(text: str) -> set[str]:
    normalized = unicodedata.normalize("NFD", text.upper())
    return {character for character in normalized if "A" <= character <= "Z"}


def lint_content(body: dict) -> list[str]:
    errors: list[str] = []
    order = body["learning_order"]
    lessons = [lesson for module in body["modules"] for lesson in module["lessons"]]
    ids = [exercise["id"] for lesson in lessons for exercise in lesson["exercises"]]
    if len(ids) != len(set(ids)):
        errors.append("IDs de exercício duplicados.")
    for lesson in lessons:
        letter = lesson["letter"]
        allowed = set(order[: order.index(letter) + 1])
        if missing := {kind.value for kind in required_types_for(letter)} - {exercise["type"] for exercise in lesson["exercises"]}:
            errors.append(f"{lesson['id']}: faltam exercícios obrigatórios ({', '.join(sorted(missing))}).")
        for exercise in lesson["exercises"]:
            where, kind, answer = exercise["id"], exercise["type"], exercise["answer"]
            if kind in ("listen_choose", "recognize_letter"):
                if answer != letter or letter not in (exercise["options"] or []):
                    errors.append(f"{where}: a resposta deve ser {letter} e estar entre as opções.")
            elif kind == "find_in_word":
                word = exercise["context_word"] or ""
                if future := letters_of(word) - allowed:
                    errors.append(f"{where}: {word} usa letra ainda não apresentada ({''.join(sorted(future))}).")
                if letter not in word or answer != f"{word.index(letter) + 1}ª posição" or answer not in (exercise["options"] or []):
                    errors.append(f"{where}: a resposta deve ser a primeira posição de {letter} em {word} e estar entre as opções.")
            elif kind == "complete_word":
                choices = exercise.get("word_choices") or []
                if len(choices) < 2:
                    errors.append(f"{where}: precisa de ao menos um distrator.")
                fits = [choice for choice in choices if choice["before"] + letter + choice["after"] == choice["word"]]
                if len(fits) != 1 or fits[0]["id"] != answer:
                    errors.append(f"{where}: exatamente uma opção deve ser completada por {letter}, e ela deve ser a resposta.")
                for choice in choices:
                    word = choice["word"]
                    if len(choice["before"]) + 1 + len(choice["after"]) != len(word) or not word.startswith(choice["before"]) or not word.endswith(choice["after"]):
                        errors.append(f"{where}: lacuna inválida em {word}.")
                    if future := letters_of(word) - allowed:
                        errors.append(f"{where}: {word} usa letra ainda não apresentada ({''.join(sorted(future))}).")
                    if choice["id"] != answer and letter in word:
                        errors.append(f"{where}: o distrator {word} contém a letra {letter}.")
    return errors
