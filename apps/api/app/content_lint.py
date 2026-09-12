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
            if len(unit["items"]) != 7 or len({item["type"] for item in unit["items"]}) != 7:
                errors.append(f"{where_unit}: a lição deve ter exatamente sete habilidades diferentes.")
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
            if unit["kind"] == "letter":
                metadata = item.get("payload") or {}
                required_metadata = {"pedagogical_objective", "difficulty", "anti_elimination_rationale", "feedback", "review"}
                if missing_metadata := required_metadata - set(metadata):
                    errors.append(f"{where}: metadados pedagógicos ausentes ({', '.join(sorted(missing_metadata))}).")
                feedback, review = metadata.get("feedback") or {}, metadata.get("review") or {}
                if not feedback.get("correct") or not feedback.get("incorrect"):
                    errors.append(f"{where}: feedback correto e de nova tentativa são obrigatórios.")
                if review.get("status") not in {"pending_human_review", "approved", "changes_requested"} or not review.get("criterion"):
                    errors.append(f"{where}: status e critério de revisão pedagógica são obrigatórios.")
                context = metadata.get("context") or {}
                if answer and answer in item["instruction"].split():
                    errors.append(f"{where}: o enunciado revela a resposta {answer}.")
                if kind in {ExerciseType.LISTEN_CHOOSE, ExerciseType.INITIAL_SOUND, ExerciseType.COMPLETE_WORD, ExerciseType.MIXED_REVIEW}:
                    masked = context.get("masked_word", "")
                    if not context.get("hide_word") or not context.get("inline_audio") or "_" not in masked:
                        errors.append(f"{where}: palavra deve aparecer lacunada, sem resposta visível, com áudio junto ao contexto.")
                    if item.get("context_word") and item["context_word"] in item["instruction"]:
                        errors.append(f"{where}: o enunciado não pode mostrar a palavra pronta.")
            if kind in (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER):
                if answer != letter or letter not in options:
                    errors.append(f"{where}: a resposta deve ser {letter} e estar entre as opções.")
            elif kind is ExerciseType.FIND_IN_WORD:
                word = item["context_word"] or ""
                check_letters(where, word, allowed)
                if not letter or letter not in word or answer != f"{word.index(letter) + 1}ª posição" or answer not in options:
                    errors.append(f"{where}: a resposta deve ser a primeira posição de {letter} em {word} e estar entre as opções.")
            elif kind is ExerciseType.INITIAL_SOUND:
                if answer != letter or answer not in options or len(set(options)) != 3 or not item["context_word"]:
                    errors.append(f"{where}: som inicial precisa de palavra e três letras distintas contendo {letter}.")
            elif kind is ExerciseType.FIND_ALL_IN_WORD:
                word = item["context_word"] or ""
                expected = [index + 1 for index, character in enumerate(word) if character == letter]
                payload = item.get("payload") or {}
                if not expected or payload.get("characters") != list(word) or payload.get("target_indices") != expected or answer != ",".join(map(str, expected)):
                    errors.append(f"{where}: deve marcar exatamente todas as ocorrências de {letter} em {word}.")
                if options != [str(index + 1) for index in range(len(word))]:
                    errors.append(f"{where}: opções devem representar todas as posições da palavra.")
            elif kind is ExerciseType.COMPARE_WORDS:
                pair = (item.get("payload") or {}).get("words") or []
                if answer != letter or answer not in options or len(pair) != 2 or item["context_word"] not in pair:
                    errors.append(f"{where}: comparação precisa de duas palavras e da letra-alvo entre as opções.")
            elif kind is ExerciseType.MIXED_REVIEW:
                if answer != letter or answer not in options or not item["context_word"] or letter not in item["context_word"]:
                    errors.append(f"{where}: revisão precisa reapresentar a letra em uma palavra.")
            elif kind is ExerciseType.SYLLABLE_LISTEN_CHOOSE:
                if answer not in options or item["target_id"] != answer or len(options) < 2:
                    errors.append(f"{where}: a sílaba-alvo deve ser a resposta e estar entre as opções.")
                for option in options:
                    check_letters(where, option, allowed)
                    if option not in syllables: errors.append(f"{where}: sílaba {option} não catalogada.")
            elif kind is ExerciseType.COMPLETE_WORD:
                context = (item.get("payload") or {}).get("context") or {}
                masked, word = context.get("masked_word", ""), item.get("context_word") or ""
                if answer != letter or answer not in options or len(options) != 3 or len(set(options)) != 3:
                    errors.append(f"{where}: deve oferecer três letras distintas e ter {letter} como resposta.")
                if not word or masked.count("_") != 1 or masked.replace("_", letter, 1) != word:
                    errors.append(f"{where}: a lacuna deve formar a palavra de contexto somente com {letter}.")
                if item.get("word_choices"):
                    errors.append(f"{where}: não deve mostrar cartões com palavras prontas.")
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
