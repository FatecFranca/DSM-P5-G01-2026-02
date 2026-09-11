"""Regras pedagógicas verificáveis sobre o corpo de /v1/content.

O mobile aplica as mesmas regras ao bundle baixado antes de substituí-lo (apps/mobile/src/content/schema.ts).
"""
from .content_data import required_letters
from .content_types import LEARNING_ORDER, PHASE_SPECS, TARGET_OF, ExerciseType, normalize_exercise_type, required_types_for

PHASE_OF = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}


def lint_content(body: dict) -> list[str]:
    errors: list[str] = []
    order = body["learning_order"]
    if order != LEARNING_ORDER:
        errors.append("A ordem de aprendizagem não corresponde ao contrato.")
    words = {word["text"]: word for word in body.get("words", [])}
    sentences = {sentence["id"]: sentence for sentence in body.get("sentences", [])}
    syllables = {syllable["id"] for syllable in body.get("syllables", [])}
    units = [(track, unit) for track in body["tracks"] for unit in track["units"]]
    letter_units = sorted((unit for track, unit in units if unit["kind"] == "letter"), key=lambda unit: unit["position"])
    if "".join(unit["focus_letter"] or "" for unit in letter_units) != LEARNING_ORDER:
        errors.append("A trilha fônica deve conter as 26 letras na ordem definida.")
    ids = [item["id"] for _, unit in units for item in unit["items"]]
    if len(ids) != len(set(ids)):
        errors.append("IDs de item duplicados.")

    def check_letters(where: str, text: str, allowed: set[str]) -> None:
        if future := set(required_letters(text)) - allowed:
            errors.append(f"{where}: {text} usa letra ainda não apresentada ({''.join(sorted(future))}).")

    for track, unit in units:
        where_unit = unit["id"]
        letter = unit["focus_letter"]
        if unit["kind"] == "letter":
            if track["kind"] != "phonics" or not letter:
                errors.append(f"{where_unit}: unidade de letra fora da trilha fônica."); continue
            index = order.index(letter)
            if PHASE_OF.get(letter) != (unit["phase"], unit["phase_title"]):
                errors.append(f"{where_unit}: fase incorreta.")
            if unit["required_letters"] != order[:index]:
                errors.append(f"{where_unit}: pré-requisitos devem ser as letras anteriores.")
            allowed = set(order[: index + 1])
            if missing := {kind.value for kind in required_types_for(letter)} - {item["type"] for item in unit["items"]}:
                errors.append(f"{where_unit}: faltam exercícios obrigatórios ({', '.join(sorted(missing))}).")
        else:
            allowed = set(order)
            expected = "".join(dict.fromkeys(letter for item in unit["items"] for letter in item["required_letters"]))
            if required_letters(expected) != unit["required_letters"]:
                errors.append(f"{where_unit}: required_letters deve ser a união das letras dos itens.")
        for item in unit["items"]:
            where, kind, answer, options = item["id"], normalize_exercise_type(item["type"]), item["answer"], item["options"] or []
            if not kind:
                errors.append(f"{where}: tipo desconhecido {item['type']}."); continue
            if item["item_kind"] != TARGET_OF[kind].value:
                errors.append(f"{where}: item_kind deve ser {TARGET_OF[kind].value}.")
            if unit["kind"] == "letter" and item["required_letters"] != unit["required_letters"]:
                errors.append(f"{where}: required_letters deve ser igual ao da unidade de letra.")
            if kind in (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER):
                if answer != letter or letter not in options:
                    errors.append(f"{where}: a resposta deve ser {letter} e estar entre as opções.")
            elif kind is ExerciseType.FIND_IN_WORD:
                word = item["context_word"] or ""
                check_letters(where, word, allowed)
                if not letter or letter not in word or answer != f"{word.index(letter) + 1}ª posição" or answer not in options:
                    errors.append(f"{where}: a resposta deve ser a primeira posição de {letter} em {word} e estar entre as opções.")
            elif kind is ExerciseType.SYLLABLE_LISTEN_CHOOSE:
                if answer not in options or item["target_id"] != answer or len(options) < 2:
                    errors.append(f"{where}: a sílaba-alvo deve ser a resposta e estar entre as opções.")
                for option in options:
                    check_letters(where, option, allowed)
                    if option not in syllables: errors.append(f"{where}: sílaba {option} não catalogada.")
            elif kind is ExerciseType.COMPLETE_WORD:
                choices = item["word_choices"] or []
                if len(choices) < 2:
                    errors.append(f"{where}: precisa de ao menos um distrator.")
                fits = [choice for choice in choices if choice["before"] + (letter or "") + choice["after"] == choice["word"]]
                if len(fits) != 1 or fits[0]["id"] != answer:
                    errors.append(f"{where}: exatamente uma opção deve ser completada por {letter}, e ela deve ser a resposta.")
                for choice in choices:
                    word = choice["word"]
                    if len(choice["before"]) + 1 + len(choice["after"]) != len(word) or not word.startswith(choice["before"]) or not word.endswith(choice["after"]):
                        errors.append(f"{where}: lacuna inválida em {word}.")
                    check_letters(where, word, allowed)
                    if choice["id"] != answer and letter in word:
                        errors.append(f"{where}: o distrator {word} contém a letra {letter}.")
            elif kind is ExerciseType.WORD_LISTEN_CHOOSE:
                if answer not in options or len(options) < 2 or item["target_id"] != answer:
                    errors.append(f"{where}: a palavra-alvo deve ser a resposta e estar entre as opções.")
                for option in options:
                    if option not in words: errors.append(f"{where}: palavra {option} não está no catálogo publicado.")
                if item["required_letters"] != required_letters(answer):
                    errors.append(f"{where}: required_letters deve ser as letras de {answer}.")
            elif kind is ExerciseType.WORD_FROM_SYLLABLES:
                parts, tokens = answer.split("-"), (item["payload"] or {}).get("tokens") or []
                word = words.get(item["target_id"] or "")
                if not word or list(word["syllables"]) != parts:
                    errors.append(f"{where}: a resposta deve ser a separação silábica catalogada de {item['target_id']}.")
                if sorted(tokens) != sorted(parts) or (tokens == parts and len(set(parts)) > 1):
                    errors.append(f"{where}: tokens devem ser as sílabas da resposta em outra ordem.")
                if item["required_letters"] != required_letters("".join(parts)):
                    errors.append(f"{where}: required_letters deve ser as letras da palavra.")
            elif kind is ExerciseType.SENTENCE_FILL_WORD:
                payload, sentence = item["payload"] or {}, sentences.get(item["target_id"] or "")
                gapped = payload.get("sentence", "")
                if not sentence or "___" not in gapped or gapped.replace("___", answer, 1) != sentence["text"]:
                    errors.append(f"{where}: a frase com a lacuna preenchida deve ser a frase catalogada.")
                if answer not in options or len(options) < 2:
                    errors.append(f"{where}: a resposta deve estar entre as opções.")
                for option in options:
                    if option not in words: errors.append(f"{where}: palavra {option} não está no catálogo publicado.")
                if sentence and item["required_letters"] != sentence["required_letters"]:
                    errors.append(f"{where}: required_letters deve ser as letras da frase.")
            elif kind is ExerciseType.SENTENCE_ORDER:
                tokens, sentence = ((item["payload"] or {}).get("tokens") or []), sentences.get(item["target_id"] or "")
                if not sentence or answer != sentence["text"]:
                    errors.append(f"{where}: a resposta deve ser a frase catalogada.")
                if sorted(tokens) != sorted(answer.split(" ")) or tokens == answer.split(" "):
                    errors.append(f"{where}: tokens devem ser as palavras da frase em outra ordem.")
                if sentence and item["required_letters"] != sentence["required_letters"]:
                    errors.append(f"{where}: required_letters deve ser as letras da frase.")
    for word in words.values():
        if word["required_letters"] != required_letters(word["text"]) or not word["syllables"]:
            errors.append(f"palavra {word['text']}: required_letters ou sílabas inconsistentes.")
    return errors
