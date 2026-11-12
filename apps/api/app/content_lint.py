"""Regras pedagógicas verificáveis sobre o corpo de /v1/content.

O mobile aplica as mesmas regras ao bundle baixado antes de substituí-lo (apps/mobile/src/content/schema.ts).
O conteúdo vem do banco de questões da Larissa (app/question_bank.py); estas regras conferem que cada adaptação
para toque continua com uma única resposta certa, entre as opções, sem revelá-la no enunciado.
"""
from .content_data import required_letters, strip_marks
from .content_types import LEARNING_ORDER, LETTER_EXERCISES_PER_LESSON, PHASE_SPECS, TARGET_OF, ExerciseType, normalize_exercise_type, required_types_for

PHASE_OF = {letter: (phase, title) for phase, title, letters in PHASE_SPECS for letter in letters}
REQUIRED_METADATA = {"pedagogical_objective", "difficulty", "anti_elimination_rationale", "feedback", "review"}
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def distinct(options: list[str], minimum: int = 3, maximum: int = 5) -> bool:
    return minimum <= len(options) <= maximum and len(set(options)) == len(options)


def lint_content(body: dict) -> list[str]:
    errors: list[str] = []
    order = body["learning_order"]
    if order != LEARNING_ORDER:
        errors.append("A ordem de aprendizagem não corresponde ao contrato.")
    words = {word["text"]: word for word in body.get("words", [])}
    sentences = {sentence["id"]: sentence for sentence in body.get("sentences", [])}
    syllables = {syllable["id"] for syllable in body.get("syllables", [])}
    asset_entries = body.get("assets", [])
    asset_ids = {asset["id"] for asset in asset_entries}
    image_assets = {asset["id"] for asset in asset_entries if asset.get("kind") == "image"}
    if len(asset_ids) != len(asset_entries):
        errors.append("IDs de ativo duplicados.")
    for asset in asset_entries:
        if asset.get("kind") == "image" and (not asset.get("license") or not asset.get("attribution")):
            errors.append(f"ativo {asset.get('id')}: licença e autoria são obrigatórias para imagens.")
    units = [(track, unit) for track in body["tracks"] for unit in track["units"]]
    letter_units = sorted((unit for track, unit in units if unit["kind"] == "letter"), key=lambda unit: unit["position"])
    if "".join(unit["focus_letter"] or "" for unit in letter_units) != LEARNING_ORDER:
        errors.append("A trilha fônica deve conter as 26 letras na ordem definida.")
    ids = [item["id"] for _, unit in units for item in unit["items"]]
    if len(ids) != len(set(ids)):
        errors.append("IDs de item duplicados.")
    minimum, maximum = LETTER_EXERCISES_PER_LESSON

    for track, unit in units:
        where_unit = unit["id"]
        letter = unit["focus_letter"]
        if not unit["items"]:
            errors.append(f"{where_unit}: unidade sem itens.")
        if unit["kind"] == "letter":
            if track["kind"] != "phonics" or not letter:
                errors.append(f"{where_unit}: unidade de letra fora da trilha fônica."); continue
            if letter not in order:
                errors.append(f"{where_unit}: letra-alvo não pertence à ordem de aprendizagem."); continue
            if PHASE_OF.get(letter) != (unit["phase"], unit["phase_title"]):
                errors.append(f"{where_unit}: fase incorreta.")
            if unit["required_letters"] != order[: order.index(letter)]:
                errors.append(f"{where_unit}: pré-requisitos devem ser as letras anteriores.")
            if missing := {kind.value for kind in required_types_for(letter)} - {item["type"] for item in unit["items"]}:
                errors.append(f"{where_unit}: faltam exercícios obrigatórios ({', '.join(sorted(missing))}).")
            if not minimum <= len(unit["items"]) <= maximum:
                errors.append(f"{where_unit}: a lição de letra deve ter de {minimum} a {maximum} exercícios.")
        elif not order.startswith(unit["required_letters"]):
            errors.append(f"{where_unit}: required_letters deve ser um trecho inicial da ordem de aprendizagem (portão do nível).")
        for item in unit["items"]:
            where, kind, answer, options = item["id"], normalize_exercise_type(item["type"]), item["answer"], item["options"] or []
            if not kind:
                errors.append(f"{where}: tipo desconhecido {item['type']}."); continue
            if item["item_kind"] != TARGET_OF[kind].value:
                errors.append(f"{where}: item_kind deve ser {TARGET_OF[kind].value}.")
            payload = item.get("payload") or {}
            if missing_metadata := REQUIRED_METADATA - set(payload):
                errors.append(f"{where}: metadados pedagógicos ausentes ({', '.join(sorted(missing_metadata))}).")
            feedback, review = payload.get("feedback") or {}, payload.get("review") or {}
            if not feedback.get("correct") or not feedback.get("incorrect"):
                errors.append(f"{where}: feedback correto e de nova tentativa são obrigatórios.")
            if review.get("status") not in {"pending_human_review", "approved", "changes_requested"} or not review.get("criterion"):
                errors.append(f"{where}: status e critério de revisão pedagógica são obrigatórios.")
            if answer and answer in item["instruction"].split():
                errors.append(f"{where}: o enunciado revela a resposta {answer}.")
            context = payload.get("context") or {}
            masked = context.get("masked_word")
            if masked is not None and ("_" not in masked or not context.get("hide_word")):
                errors.append(f"{where}: a palavra lacunada deve esconder a resposta.")
            if context.get("hide_word") and item.get("context_word") and item["context_word"] in item["instruction"]:
                errors.append(f"{where}: o enunciado não pode mostrar a palavra escondida.")
            if payload.get("image_asset"):
                _lint_image(errors, where, payload, image_assets)

            if kind in (ExerciseType.LISTEN_CHOOSE, ExerciseType.RECOGNIZE_LETTER):
                if (unit["kind"] == "letter" and answer != letter) or answer not in options or not distinct(options):
                    errors.append(f"{where}: a letra ouvida deve ser a resposta, entre três a cinco opções distintas.")
            elif kind is ExerciseType.INITIAL_SOUND:
                word = item.get("context_word") or ""
                if not word or answer != strip_marks(word)[0] or answer not in options or not distinct(options, 3, 4):
                    errors.append(f"{where}: a resposta deve ser a letra inicial de {word}, entre três ou quatro opções distintas.")
                if masked is not None and masked != "_" + word[1:]:
                    errors.append(f"{where}: a lacuna deve esconder só a letra inicial de {word}.")
            elif kind is ExerciseType.FIRST_LAST_LETTERS:
                word = item.get("context_word") or ""
                expected = [1, len(word)]
                if len(word) < 2 or payload.get("characters") != list(word) or payload.get("target_indices") != expected or answer != ",".join(map(str, expected)):
                    errors.append(f"{where}: deve marcar a primeira e a última letra de {word}.")
                if options != [str(index + 1) for index in range(len(word))]:
                    errors.append(f"{where}: opções devem representar todas as posições da palavra.")
            elif kind is ExerciseType.ALPHABET_NEIGHBORS:
                target = payload.get("letter", "")
                index = ALPHABET.find(target) if target else -1
                if not 0 < index < 25 or answer != f"{ALPHABET[index - 1]} {target} {ALPHABET[index + 1]}" or answer not in options or not distinct(options, 3, 3):
                    errors.append(f"{where}: a resposta deve ser a letra anterior, {target} e a posterior, entre três sequências.")
            elif kind is ExerciseType.SYLLABLE_LISTEN_CHOOSE:
                if answer not in options or item["target_id"] != answer or not distinct(options, 2, 5):
                    errors.append(f"{where}: a sílaba-alvo deve ser a resposta e estar entre as opções.")
                for option in options:
                    if option not in syllables: errors.append(f"{where}: sílaba {option} não catalogada.")
            elif kind is ExerciseType.SYLLABLE_POSITION_CHOOSE:
                word = words.get(payload.get("word", ""))
                parts, position = payload.get("syllables") or [], payload.get("position")
                expected = parts[0] if parts and position == "initial" else parts[-1] if parts and position == "final" else None
                if not word or parts != word["syllables"] or answer != expected or item["target_id"] != answer:
                    errors.append(f"{where}: a resposta deve ser a sílaba catalogada na posição pedida.")
                if answer not in options or not distinct(options) or any(option not in syllables for option in options):
                    errors.append(f"{where}: deve oferecer de três a cinco sílabas catalogadas e distintas, incluindo a resposta.")
                if masked is not None and masked.split() != [("___" if index == (0 if position == "initial" else len(parts) - 1) else part) for index, part in enumerate(parts)]:
                    errors.append(f"{where}: a lacuna deve esconder só a sílaba pedida.")
            elif kind is ExerciseType.WORD_FROM_SYLLABLES:
                parts, tokens = answer.split("-"), payload.get("tokens") or []
                word = words.get(item["target_id"] or "")
                if not word or list(word["syllables"]) != parts:
                    errors.append(f"{where}: a resposta deve ser a separação silábica catalogada de {item['target_id']}.")
                if sorted(tokens) != sorted(parts) or (tokens == parts and len(set(parts)) > 1):
                    errors.append(f"{where}: tokens devem ser as sílabas da resposta em outra ordem.")
                if word and word["text"] in item["instruction"]:
                    errors.append(f"{where}: o enunciado de montagem não pode revelar a palavra pronta.")
            elif kind is ExerciseType.SYLLABLES_TO_WORD:
                parts = payload.get("syllables") or []
                if not parts or answer != "".join(parts) or item["target_id"] != answer or answer not in options or not distinct(options, 3, 3):
                    errors.append(f"{where}: a resposta deve ser a palavra formada pelas sílabas, entre três palavras.")
                for option in options:
                    if option not in words: errors.append(f"{where}: palavra {option} não está no catálogo publicado.")
            elif kind is ExerciseType.WORD_LETTER_FIT:
                cards = item.get("word_choices") or []
                target = payload.get("letter", "")
                fitting = [card for card in cards if card["before"] == "" and strip_marks(card["word"])[:1] == target and card["word"][1:] == card["after"]]
                if len(cards) < 2 or len(fitting) != 1 or fitting[0]["id"] != answer or len({card["id"] for card in cards}) != len(cards):
                    errors.append(f"{where}: exatamente uma palavra deve se completar com {target}.")
                if any(card["word"] != card["before"] + card["word"][len(card["before"])] + card["after"] for card in cards):
                    errors.append(f"{where}: cada cartão deve ter uma única lacuna.")
            elif kind is ExerciseType.WORD_LISTEN_CHOOSE:
                if answer not in options or len(options) < 2 or item["target_id"] != answer:
                    errors.append(f"{where}: a palavra-alvo deve ser a resposta e estar entre as opções.")
                for option in options:
                    if option not in words: errors.append(f"{where}: palavra {option} não está no catálogo publicado.")
            elif kind in (ExerciseType.WORD_IMAGE_CHOOSE, ExerciseType.PICTURE_CHOOSE):
                if item["target_id"] != answer or answer not in words or answer not in options or not distinct(options):
                    errors.append(f"{where}: deve oferecer de três a cinco palavras distintas publicadas, incluindo a palavra-alvo.")
                if any(option not in words for option in options):
                    errors.append(f"{where}: todas as opções devem ser palavras publicadas.")
                if kind is ExerciseType.WORD_IMAGE_CHOOSE and not (payload.get("image_asset") or context.get("image")):
                    errors.append(f"{where}: a palavra precisa de figura.")
                if kind is ExerciseType.PICTURE_CHOOSE and set((payload.get("option_images") or {})) != set(options):
                    errors.append(f"{where}: cada opção precisa de figura.")
            elif kind is ExerciseType.SENTENCE_FILL_WORD:
                sentence = sentences.get(item["target_id"] or "")
                gapped = payload.get("sentence", "")
                if not sentence or "___" not in gapped or gapped.replace("___", answer, 1) != sentence["text"]:
                    errors.append(f"{where}: a frase com a lacuna preenchida deve ser a frase catalogada.")
                if answer not in options or len(options) < 2:
                    errors.append(f"{where}: a resposta deve estar entre as opções.")
            elif kind is ExerciseType.SENTENCE_ORDER:
                tokens, sentence = payload.get("tokens") or [], sentences.get(item["target_id"] or "")
                if not sentence or answer != sentence["text"]:
                    errors.append(f"{where}: a resposta deve ser a frase catalogada.")
                if sorted(tokens) != sorted(answer.split(" ")) or tokens == answer.split(" "):
                    errors.append(f"{where}: tokens devem ser as palavras da frase em outra ordem.")
            elif kind is ExerciseType.SENTENCE_IMAGE_CHOOSE:
                sentence = sentences.get(item["target_id"] or "")
                if not sentence or answer != sentence["text"] or answer not in options or not distinct(options, 3, 3):
                    errors.append(f"{where}: deve oferecer três frases distintas, incluindo a cena-alvo.")
                if not (payload.get("image_asset") or context.get("image")):
                    errors.append(f"{where}: a cena precisa de figura.")
            elif kind in (ExerciseType.FIND_IN_WORD, ExerciseType.FIND_ALL_IN_WORD, ExerciseType.COMPARE_WORDS, ExerciseType.MIXED_REVIEW, ExerciseType.COMPLETE_WORD):
                if answer not in options and kind is not ExerciseType.FIND_ALL_IN_WORD:
                    errors.append(f"{where}: a resposta deve estar entre as opções.")
    for word in words.values():
        if word["required_letters"] != required_letters(word["text"]) or not word["syllables"]:
            errors.append(f"palavra {word['text']}: required_letters ou sílabas inconsistentes.")
        if word.get("image_asset"):
            _lint_image(errors, f"palavra {word['text']}", word, image_assets)
    for sentence in sentences.values():
        if sentence.get("image_asset"):
            _lint_image(errors, f"frase {sentence['id']}", sentence, image_assets)
    return errors


def _lint_image(errors: list[str], where: str, payload: dict, assets: set[str]) -> None:
    asset = payload.get("image_asset")
    if not asset or asset not in assets:
        errors.append(f"{where}: image_asset deve referenciar um ativo conhecido.")
    if not payload.get("image_alt"):
        errors.append(f"{where}: image_alt é obrigatório.")
    if not payload.get("license") or not payload.get("attribution"):
        errors.append(f"{where}: licença e autoria do ativo são obrigatórias.")
