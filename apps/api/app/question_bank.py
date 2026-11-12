"""Currículo do app a partir das questões curadas por Larissa (bancoquestoesequiz/gerar_banco.py).

`app/data/banco_questoes.json` é a cópia gerada por scripts/export_question_bank.py. Cada questão vira um item de
um tipo do contrato (contracts/exercise-types.json), respondido só por toque:

- ligar pares (1B, 3B) vira uma escolha por figura, com as mesmas opções do grupo;
- digitar letras (1C, 1D) vira escolher a sequência certa ou tocar a primeira e a última letra;
- separar (2D) vira montar a palavra tocando as sílabas; formar (2E) vira escolher a palavra formada;
- completar sílaba (2B) vira escolher a sílaba entre três; completar com a letra (3E) vira escolher a palavra.

As figuras são emoji grandes; as palavras com desenho próprio no app usam o desenho.
"""
import json
import random
from functools import cache
from pathlib import Path

from .content_data import ASSET_ATTRIBUTION, ASSET_LICENSE, deterministic_shuffle, required_letters, strip_marks
from .content_types import LEARNING_ORDER, PHASE_SPECS, ExerciseType

BANK_PATH = Path(__file__).resolve().parent / "data" / "banco_questoes.json"

# Portões de nível: o crédito do nivelamento (contracts/placement-quiz.json) libera as fases 1–2 para os níveis 2 e 3
# e as três fases para o nível 4.
PHASES_1_2 = "".join(letters for phase, _, letters in PHASE_SPECS if phase <= 2)
ALL_LETTERS = LEARNING_ORDER

LETTER_NAMES = {
    "A": "a", "B": "bê", "C": "cê", "D": "dê", "E": "é", "F": "efe", "G": "gê", "H": "agá", "I": "i", "J": "jota",
    "K": "cá", "L": "ele", "M": "eme", "N": "ene", "O": "ó", "P": "pê", "Q": "quê", "R": "erre", "S": "esse", "T": "tê",
    "U": "u", "V": "vê", "W": "dáblio", "X": "xis", "Y": "ípsilon", "Z": "zê",
}

# Desenhos vetoriais embarcados no app (src/assets/illustrations.tsx).
SVG = {
    "CASA": "images/words/casa.svg", "MESA": "images/words/mesa.svg", "CAMA": "images/words/cama.svg",
    "SALA": "images/words/sala.svg", "COPO": "images/words/copo.svg", "PRATO": "images/words/prato.svg",
    "PORTA": "images/words/porta.svg", "PANELA": "images/words/panela.svg", "TAPETE": "images/words/tapete.svg",
    "SAPATO": "images/quiz/sapato.svg", "O COPO ESTÁ NA MESA": "images/quiz/copo-em-cima-da-mesa.svg",
}

EMOJI = {
    "ABELHA": "🐝", "ANJO": "👼", "BOLSA": "👜", "BOLO": "🎂", "CASA": "🏠", "COPO": "🥛", "DADO": "🎲", "DENTE": "🦷",
    "ESCADA": "🪜", "ESCOVA": "🪥", "FOLHA": "🍃", "FOCA": "🦭", "GATO": "🐈", "GARRAFA": "🍾", "HARPA": "🪉",
    "HELICÓPTERO": "🚁", "IGREJA": "⛪", "ILHA": "🏝️", "JANELA": "🪟", "JARRA": "🫙", "KIMONO": "👘", "KETCHUP": "🥫",
    "LARANJA": "🍊", "LATA": "🥫", "MARTELO": "🔨", "MAÇÃ": "🍎", "NAVIO": "🚢", "NUVEM": "☁️", "OVO": "🥚",
    "ORELHA": "👂", "PONTE": "🌉", "PERA": "🍐", "QUEIJO": "🧀", "QUADRO": "🖼️", "RELÓGIO": "⏰", "RATO": "🐭",
    "SAPATO": "👞", "SOL": "☀️", "TAPETE": "🧶", "TOMATE": "🍅", "UVA": "🍇", "URSO": "🐻", "VACA": "🐄", "VELA": "🕯️",
    "WAFFLE": "🧇", "WI-FI": "📶", "XÍCARA": "☕", "XALE": "🧣", "YOGA": "🧘", "YAKISOBA": "🍜", "ZEBRA": "🦓",
    "ZÍPER": "🤐", "ÓCULOS": "👓", "SORVETE": "🍦", "CAMELO": "🐫", "BANANA": "🍌", "MESA": "🍽️", "PANELA": "🍲",
    "BATEDEIRA": "🥣", "PORTA": "🚪", "CHAMA": "🔥", "PRATO": "🍛", "CARRO": "🚗", "BOLA": "⚽", "DEDO": "☝️",
    "CASACO": "🧥", "MEIA": "🧦", "CAMA": "🛏️", "SALA": "🛋️", "LIVRO": "📖", "BALANÇO": "🛝",
    "A LARANJA É UMA FRUTA": "🍊", "O COPO ESTÁ NA MESA": "🥛", "A MENINA BRINCA NO BALANÇO": "👧🛝",
    "O GATO DORME NA CADEIRA": "🐈💤🪑", "O MENINO LÊ UM LIVRO": "👦📖", "A MULHER SEGURA UMA BOLSA": "👩👜",
}

# Separação silábica de todas as palavras publicadas (alvos e opções). As 18 de SILABAS_POR_PALAVRA vêm da curadoria
# da Larissa; as demais seguem a mesma regra (dígrafos LH, NH e CH ficam juntos; RR e SC se separam).
SYLLABLES = {
    "BATEDEIRA": "BA TE DEI RA", "BOLA": "BO LA", "BOLSA": "BOL SA", "BOTÃO": "BO TÃO", "CALA": "CA LA",
    "CAMA": "CA MA", "CAPA": "CA PA", "CARRO": "CAR RO", "CASACO": "CA SA CO", "CHAMA": "CHA MA", "DEDO": "DE DO",
    "DENTE": "DEN TE", "ESCADA": "ES CA DA", "FACA": "FA CA", "FALA": "FA LA", "FOCA": "FO CA", "GARRAFA": "GAR RA FA",
    "GATO": "GA TO", "LARANJA": "LA RAN JA", "MALA": "MA LA", "MARTELO": "MAR TE LO", "MEIA": "MEI A", "MOLA": "MO LA",
    "MÃOS": "MÃOS", "NINHO": "NI NHO", "NOME": "NO ME", "NUVEM": "NU VEM", "PERA": "PE RA", "PONTA": "PON TA",
    "PONTE": "PON TE", "PORTA": "POR TA", "POSTE": "POS TE", "PRATO": "PRA TO", "SOL": "SOL", "UNHA": "U NHA",
    "URNA": "UR NA", "URSO": "UR SO", "VACA": "VA CA", "RATO": "RA TO", "LIVRO": "LI VRO",
}

REVIEW = {
    "status": "pending_human_review",
    "criterion": "Questão curada no banco da Larissa (bancoquestoesequiz); aprovar após adulto alfabetizando compreender a instrução e responder sem depender da posição das opções.",
}


@cache
def bank() -> dict:
    return json.loads(BANK_PATH.read_text(encoding="utf-8"))


def questions(model: str) -> list[dict]:
    return [question for question in bank()["questoes"] if question["modelo"] == model]


@cache
def syllables_of() -> dict[str, list[str]]:
    parts = {word: value.split() for word, value in SYLLABLES.items()}
    parts.update(bank()["silabas_por_palavra"])
    return parts


def initial(text: str) -> str:
    return strip_marks(text)[0]


def shuffled(values: list[str], seed: str) -> list[str]:
    """Ordem estável por item, para a posição da resposta não seguir padrão."""
    copy = list(values)
    random.Random(f"prosa:{seed}").shuffle(copy)
    return copy


def picture(term: str) -> dict:
    """Figura da questão: o desenho embarcado (`image_asset` + licença) quando existe, senão o emoji (`image`)."""
    if term in SVG:
        return {"image_asset": SVG[term], "image_alt": f"Desenho de {term.lower()}.", "license": ASSET_LICENSE, "attribution": ASSET_ATTRIBUTION}
    return {"image": EMOJI.get(term, "🔤")}


def emoji_of(picture_entry: dict) -> dict:
    return {"image": picture_entry["image"]} if "image" in picture_entry else {}


def asset_of(picture_entry: dict) -> dict:
    return {key: value for key, value in picture_entry.items() if key != "image"}


def thumbnail(term: str) -> dict:
    """Figura pequena (cartões e opções): desenho embarcado ou emoji."""
    entry = picture(term)
    return {"image_asset": entry["image_asset"]} if "image_asset" in entry else {"image": entry["image"]}


def gapped(parts: list[str], index: int) -> str:
    shown = list(parts)
    shown[index] = "___"
    return " ".join(shown)


def metadata(question: dict, objective: str, difficulty: str, rationale: str, correct: str, retry: str, **extra) -> dict:
    return {
        "pedagogical_objective": objective, "difficulty": difficulty, "anti_elimination_rationale": rationale,
        "feedback": {"correct": correct, "incorrect": retry}, "review": REVIEW,
        "source": {"bank": "variacoes-prosa" if question.get("variation") else "bancoquestoesequiz", "question_id": question["id"], "model": question["modelo"], "original_instruction": question["enunciado"]},
        **extra,
    }


def variation(model: str, key: str, instruction: str) -> dict:
    """Questão nova no formato de um modelo de EXERCICIOSPARAOAPP.txt, para dar mais variedade ao banco."""
    return {"id": f"var-{model}-{key}", "modelo": model, "enunciado": instruction, "variation": True}


def scrambled(tokens: list[str], seed: str) -> list[str]:
    """Ordem estável e diferente da original (letras repetidas podem formar a mesma palavra: evita isso também)."""
    generator = random.Random(f"prosa:{seed}")
    for _ in range(200):
        candidate = list(tokens)
        generator.shuffle(candidate)
        if "".join(candidate) != "".join(tokens):
            return candidate
    return list(reversed(tokens))


def letters_to_word(question: dict, item_id: str, word: str, difficulty: str = "medio") -> dict:
    """Figura e as letras do nome embaralhadas: a pessoa monta a palavra na ordem (no lugar de 1D, primeira e última letra)."""
    answer = word.replace("-", "")
    pic = picture(word)
    return spec(item_id, ExerciseType.LETTERS_TO_WORD, "Monte o nome do desenho: toque nas letras na ordem.", answer, metadata(
        question, "Escrever o nome do desenho ordenando as letras.", difficulty, "Todas as letras da palavra aparecem fora de ordem; só a sequência certa forma o nome.",
        f"Isso: {word}.", "Ouça o nome do desenho e procure a primeira letra; depois siga o som.", tokens=scrambled(list(answer), item_id),
        context={"word": word, "hide_word": True, **emoji_of(pic)}, **asset_of(pic)), target_id=word, tts=word, required=word)


def match_row(word: str, masked: str, answer: str) -> dict:
    return {"word": word, "masked": masked, "answer": answer, **thumbnail(word)}


def match_missing(question: dict, item_id: str, rows: list[dict], options: list[str], instruction: str, piece: str, difficulty: str) -> dict:
    """Várias figuras, cada uma com o nome faltando uma letra ou sílaba: a pessoa completa (liga) cada figura à peça certa."""
    words = [row["word"] for row in rows]
    return spec(item_id, ExerciseType.MATCH_MISSING, instruction, ",".join(row["answer"] for row in rows), metadata(
        question, f"Completar o nome de cada figura com a {piece} que falta.", difficulty, "As peças servem a figuras diferentes; cada nome só se completa com uma delas.",
        "Isso: todas as palavras ficaram completas.", "Ouça o nome de cada figura e confira a peça que falta.", rows=rows, piece=piece),
        options=options, tts=instruction, required="".join(words))


def spec(item_id: str, kind: ExerciseType, instruction: str, answer: str, payload: dict, *, tts: str | None = None, required: str | None = None, **fields) -> dict:
    return {"id": item_id, "type": kind, "instruction": instruction, "answer": answer, "payload": payload, "tts": tts or instruction, "required": required or answer, **fields}


# --- Nível 1: Letras -------------------------------------------------------------------------------------------------

def listen_letter(question: dict) -> dict:
    letter = question["gabarito"]
    # Mesmo ID canônico da prática de escuta anterior (content_ids): clientes antigos e o histórico continuam válidos.
    return spec(f"exercise-{letter}-listen", ExerciseType.LISTEN_CHOOSE, question["enunciado"], letter, metadata(
        question, "Reconhecer a letra pelo nome ouvido.", "introducao", "As opções misturam letras de formas e sons diferentes; só o áudio decide.",
        f"Isso: você ouviu a letra {letter}.", "Toque no som de novo e compare as letras."), options=question["dados"]["opcoes"], tts=LETTER_NAMES[letter])


def initial_from_picture(question: dict, item_id: str, term: str, options: list[str], instruction: str, difficulty: str, masked: str | None) -> dict:
    letter = initial(term)
    pic = picture(term)
    context = {"word": term, "hide_word": True, "inline_audio": True, **emoji_of(pic)}
    if masked:
        context["masked_word"] = masked
    visual = asset_of(pic)
    return spec(item_id, ExerciseType.INITIAL_SOUND, instruction, letter, metadata(
        question, "Relacionar o som inicial do nome do desenho à letra.", difficulty, "As opções são letras do mesmo grupo; o nome do desenho decide.",
        f"Isso: {term} começa com {letter}.", "Ouça o nome do desenho e preste atenção ao primeiro som.", context=context, **visual), options=options, context_word=term, tts=term)


def neighbors(question: dict) -> dict:
    letter = question["dados"]["letra"]
    before, after = question["gabarito"]
    index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".index(letter)
    far = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[max(index - 2, 0)], "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[min(index + 2, 25)]
    answer = f"{before} {letter} {after}"
    options = shuffled([answer, f"{after} {letter} {before}", f"{far[0]} {letter} {far[1]}"], question["id"])
    return spec(f"bq-{question['id']}", ExerciseType.ALPHABET_NEIGHBORS, "Toque nas letras que vêm antes e depois, na ordem do alfabeto.", answer, metadata(
        question, "Situar a letra na sequência do alfabeto.", "medio", "As alternativas trocam a ordem ou pulam uma letra.",
        f"Isso: no alfabeto vem {before}, depois {letter}, depois {after}.", "Recite o alfabeto até a letra e veja quem vem antes e depois.",
        letter=letter, context={"label": f"_ {letter} _"}), options=options, required=answer)


def initial_mask(term: str) -> str:
    return "_" + term[1:]


def match_letters(question: dict) -> dict:
    """1B, ligar cada objeto à letra inicial: as figuras aparecem com o nome sem a primeira letra."""
    rows = [match_row(image["termo"], initial_mask(image["termo"]), question["gabarito"][image["id"]]) for image in question["dados"]["imagens"]]
    return match_missing(question, f"bq-{question['id']}", rows, question["dados"]["opcoes"], "Complete o nome de cada objeto com a letra que falta.", "letra", "medio")


def letter_units() -> list[dict]:
    by_letter: dict[str, list[dict]] = {letter: [] for letter in LEARNING_ORDER}
    for question in questions("1E"):
        by_letter[question["gabarito"]].append(listen_letter(question))
    for question in questions("1A"):
        term = question["dados"]["imagem"]["termo"]
        by_letter[initial(term)].append(initial_from_picture(question, f"bq-{question['id']}", term, question["dados"]["opcoes"], question["enunciado"], "facil", question["dados"]["lacuna"]))
    for question in questions("1D"):
        word = question["dados"]["palavra"]
        by_letter[initial(word)].append(letters_to_word(question, f"bq-{question['id']}", word, "facil" if len(word) <= 4 else "medio"))
    for question in questions("1C"):
        by_letter[question["dados"]["letra"]].append(neighbors(question))
    # Ligar figuras às letras entra como revisão na lição que completa as letras do grupo.
    for question in questions("1B"):
        last = max(question["gabarito"].values(), key=LEARNING_ORDER.index)
        by_letter[last].append(match_letters(question))
    return [{"letter": letter, "items": by_letter[letter]} for letter in LEARNING_ORDER]


# --- Nível 2: Sílabas ------------------------------------------------------------------------------------------------

def syllable_position(question: dict, item_id: str, word: str, position: str, options: list[str], instruction: str, masked: str | None, difficulty: str) -> dict:
    parts = syllables_of()[word]
    answer = parts[0] if position == "initial" else parts[-1]
    label = "inicial" if position == "initial" else "final"
    pic = picture(word)
    context = {"word": word, "hide_word": True, "inline_audio": True, **emoji_of(pic)}
    if masked:
        context["masked_word"] = masked
    visual = asset_of(pic)
    return spec(item_id, ExerciseType.SYLLABLE_POSITION_CHOOSE, instruction, answer, metadata(
        question, f"Identificar a sílaba {label} do nome do desenho.", difficulty, "As opções são sílabas de outras palavras da mesma atividade.",
        f"Isso: {answer} é a sílaba {label} de {word}.", "Ouça o nome do desenho devagar e perceba a parte pedida.",
        word=word, syllables=parts, position=position, context=context, **visual), options=options, target_id=answer, context_word=word, tts=word, required=word)


def complete_with_syllables(question: dict) -> dict:
    """2A: as figuras com a sílaba inicial faltando e as sílabas embaixo; cada sílaba completa uma palavra."""
    rows = []
    for line in question["dados"]["linhas"]:
        word = line["imagem"]["termo"]
        rows.append(match_row(word, gapped(syllables_of()[word], 0), syllables_of()[word][0]))
    return match_missing(question, f"bq-{question['id']}", rows, question["dados"]["opcoes"], question["enunciado"], "sílaba", "facil")


def syllable_groups(position: str) -> list[dict]:
    """Novas variações de 2A com as 18 palavras curadas: grupos de três, sílaba inicial ou final faltando."""
    words = list(bank()["silabas_por_palavra"])
    index = 0 if position == "initial" else -1
    # Grupos diferentes dos de 2A: palavras de posições alternadas.
    order = words[1::2] + words[0::2] if position == "initial" else words[2:] + words[:2]
    items = []
    for number, group in enumerate(chunks(order, 3), 1):
        rows = [match_row(word, gapped(syllables_of()[word], index if index == 0 else len(syllables_of()[word]) - 1), syllables_of()[word][index]) for word in group]
        options = shuffled(list(dict.fromkeys(row["answer"] for row in rows)), f"2A-{position}-{number}")
        label = "inicial" if position == "initial" else "final"
        question = variation("2A", f"{label}-{number}", f"Complete as palavras com a sílaba {label}.")
        items.append(match_missing(question, question["id"], rows, options, question["enunciado"], "sílaba", "facil" if position == "initial" else "medio"))
    return items


def syllable_gap(question: dict, words: list[str]) -> dict:
    word = question["dados"]["imagem"]["termo"]
    position = "initial" if question["dados"]["lacuna"].startswith("___") else "final"
    index = 0 if position == "initial" else -1
    answer = syllables_of()[word][index]
    start = words.index(word)
    distractors: list[str] = []
    for other in words[start + 1:] + words[:start]:
        candidate = syllables_of()[other][index]
        if candidate != answer and candidate not in distractors:
            distractors.append(candidate)
        if len(distractors) == 2:
            break
    return syllable_position(question, f"bq-{question['id']}", word, position, shuffled([answer, *distractors], question["id"]), question["enunciado"], question["dados"]["lacuna"], "medio")


def syllable_from_picture(question: dict) -> dict:
    word = question["dados"]["imagem"]["termo"]
    return syllable_position(question, f"bq-{question['id']}", word, "initial", question["dados"]["opcoes"], question["enunciado"], None, "medio")


def separate(question: dict) -> dict:
    word = question["dados"]["palavra"]
    parts = syllables_of()[word]
    return spec(f"bq-{question['id']}", ExerciseType.WORD_FROM_SYLLABLES, "Separe a palavra em sílabas: toque nas partes na ordem.", "-".join(parts), metadata(
        question, "Separar a palavra escrita em sílabas.", "medio", "As sílabas aparecem fora de ordem.",
        f"Isso: {'-'.join(parts)}.", "Leia a palavra devagar, uma parte de cada vez.", tokens=deterministic_shuffle(parts),
        context={"word": word, "label": word, **emoji_of(picture(word))}, **asset_of(picture(word))), target_id=word, tts=word, required=word)


def form_word(question: dict, words: list[str]) -> dict:
    parts = question["dados"]["silabas"]
    answer = "".join(parts)
    start = words.index(answer)
    others = words[start + 1:] + words[:start]
    shares = [other for other in others if set(syllables_of()[other]) & set(parts)]
    distractors = (shares + [other for other in others if other not in shares])[:2]
    return spec(f"bq-{question['id']}", ExerciseType.SYLLABLES_TO_WORD, "Junte as sílabas e toque na palavra que elas formam.", answer, metadata(
        question, "Juntar sílabas para formar uma palavra.", "medio", "As outras palavras repetem sílabas da resposta.",
        f"Isso: {' + '.join(parts)} forma {answer}.", "Leia cada sílaba em voz alta e junte os sons.",
        syllables=parts, context={"label": " + ".join(parts)}), options=shuffled([answer, *distractors], question["id"]), target_id=answer, tts=". ".join(parts), required=answer)


def listen_syllable(question: dict) -> dict:
    syllable = question["gabarito"]
    return spec(f"bq-{question['id']}", ExerciseType.SYLLABLE_LISTEN_CHOOSE, question["enunciado"], syllable, metadata(
        question, "Associar a sílaba ouvida à forma escrita.", "facil", "As opções compartilham letras e diferem no som.",
        f"Isso: você ouviu {syllable}.", "Toque no som de novo e compare as vogais."), options=question["dados"]["opcoes"], target_id=syllable, tts=syllable)


def chunks(values: list, size: int) -> list[list]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def syllable_tracks() -> list[dict]:
    words = list(bank()["silabas_por_palavra"])
    families: dict[str, list[dict]] = {}
    for question in questions("2F"):
        families.setdefault(question["gabarito"][0], []).append(listen_syllable(question))
    family_units = {consonant: {"id": f"silabas-{consonant.lower()}", "kind": "syllable", "title": f"Sílabas com {consonant}",
                                "required_letters": LEARNING_ORDER[:max(LEARNING_ORDER.index(consonant) + 1, len(PHASES_1_2))], "items": families[consonant]}
                    for consonant in LEARNING_ORDER if consonant in families}
    complete = [complete_with_syllables(question) for question in questions("2A")] + syllable_groups("initial")
    pictures = [syllable_from_picture(question) for question in questions("2C")]
    simple = [unit for consonant, unit in family_units.items() if consonant in PHASES_1_2]
    simple += [{"id": "silabas-completar", "kind": "syllable", "title": "Complete com a sílaba", "required_letters": PHASES_1_2, "items": complete},
               {"id": "silabas-completar-final", "kind": "syllable", "title": "Complete com a sílaba final", "required_letters": PHASES_1_2, "items": syllable_groups("final")}]
    simple += [{"id": f"silabas-desenho-{index}", "kind": "syllable", "title": f"Sílaba inicial do desenho {index}", "required_letters": PHASES_1_2, "items": part}
               for index, part in enumerate(chunks(pictures, 9), 1)]
    simple += [unit for consonant, unit in family_units.items() if consonant not in PHASES_1_2]

    gaps = {}
    for question in questions("2B"):
        item = syllable_gap(question, words)
        gaps[(item["payload"]["word"], item["payload"]["position"])] = item
    separated = {question["dados"]["palavra"]: separate(question) for question in questions("2D")}
    formed = {"".join(question["dados"]["silabas"]): form_word(question, words) for question in questions("2E")}
    complex_units = []
    for index, group in enumerate(chunks(words, 9), 1):
        complex_units += [
            {"id": f"complexas-{index}-inicial", "kind": "syllable", "title": f"Sílaba inicial {index}", "required_letters": PHASES_1_2,
             "items": [gaps[(word, "initial")] for word in group]},
            {"id": f"complexas-{index}-final", "kind": "syllable", "title": f"Sílaba final {index}", "required_letters": PHASES_1_2,
             "items": [gaps[(word, "final")] for word in group]},
            {"id": f"complexas-{index}-separar", "kind": "syllable", "title": f"Separe as sílabas {index}", "required_letters": PHASES_1_2,
             "items": [separated[word] for word in group]},
            {"id": f"complexas-{index}-formar", "kind": "syllable", "title": f"Forme palavras {index}", "required_letters": PHASES_1_2,
             "items": [formed[word] for word in group]},
        ]
    return [
        {"id": "silabas", "slug": "silabas", "title": "Sílabas", "kind": "theme", "position": 2,
         "description": "Nível 2: ouvir, completar e reconhecer sílabas (banco de questões da Larissa).", "units": simple},
        {"id": "silabas-complexas", "slug": "silabas-complexas", "title": "Sílabas complexas", "kind": "theme", "position": 3,
         "description": "Nível 2: sílaba inicial e final, separar e formar palavras.", "units": complex_units},
    ]


# --- Nível 3: Palavras -----------------------------------------------------------------------------------------------

def word_cards(question: dict, letter_lines: dict[str, list[dict]]) -> list[dict]:
    letter = question["id"].split("-", 1)[1].upper()
    # H é mudo: HARPA soa como se começasse com A, então não entra como distrator.
    letters = [entry for entry in letter_lines if entry not in (letter, "H")]
    items = []
    for number, line in enumerate(question["dados"]["linhas"]):
        word = line["imagem"]["termo"]
        start = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".index(letter)
        picks = [letters[(start + offset) % len(letters)] for offset in (6, 13)]
        others = [letter_lines[pick][number % len(letter_lines[pick])]["imagem"]["termo"] for pick in picks]
        cards = []
        for term in [word, *others]:
            entry = {"id": strip_marks(term).lower(), "word": term, "before": "", "after": term[1:], **thumbnail(term)}
            cards.append(entry)
        answer = cards[0]["id"]
        items.append(spec(f"bq-{question['id']}-{line['imagem']['id']}", ExerciseType.WORD_LETTER_FIT, f"Complete com a letra {letter}: em qual palavra ela entra?", answer, metadata(
            question, "Associar a letra às palavras que começam com ela.", "medio", "As outras palavras começam com outras letras; o nome do desenho decide.",
            f"Isso: {word} começa com {letter}.", "Ouça o nome de cada desenho e procure o que começa com o som da letra.", letter=letter),
            word_choices=shuffled(cards, f"{question['id']}-{number}"), target_id=word, tts=LETTER_NAMES[letter], required=word))
    return items


def word_for_picture(question: dict, item_id: str, word: str, options: list[str], instruction: str, difficulty: str) -> dict:
    visual = picture(word)
    return spec(item_id, ExerciseType.WORD_IMAGE_CHOOSE, instruction, word, metadata(
        question, "Ler as palavras e escolher a que nomeia o desenho.", difficulty, "As opções são palavras parecidas na escrita ou do mesmo grupo.",
        f"Isso: o desenho é {word}.", "Leia cada palavra devagar e compare com o desenho.", context=emoji_of(visual), **asset_of(visual)),
        options=options, target_id=word, tts=instruction, required=word)


def picture_for_word(question: dict) -> dict:
    word = question["dados"]["palavra"]
    options = [image["termo"] for image in question["dados"]["imagens"]]
    images = {term: thumbnail(term) for term in options}
    return spec(f"bq-{question['id']}", ExerciseType.PICTURE_CHOOSE, question["enunciado"], word, metadata(
        question, "Ler a palavra e escolher o desenho correspondente.", "medio", "Os desenhos têm nomes parecidos com a palavra.",
        f"Isso: este é o desenho de {word}.", "Leia a palavra devagar e pense no nome de cada desenho.",
        option_images=images, context={"label": word}), options=options, target_id=word, required=word)


VOWELS = "AEIOU"


def letter_groups() -> list[dict]:
    """Novas variações de 1B (ligar figura e letra): três ou quatro figuras de letras diferentes, sem a letra inicial."""
    by_letter: dict[str, list[str]] = {}
    for question in questions("1A"):
        term = question["dados"]["imagem"]["termo"]
        by_letter.setdefault(initial(term), []).append(term)
    letters = [letter for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if letter in by_letter]
    groups = chunks(letters, 3)
    if len(groups[-1]) < 3:
        groups[-2] += groups.pop()
    items = []
    for set_index in range(2):
        for number, group in enumerate(groups, 1):
            rows = [match_row(by_letter[letter][set_index], initial_mask(by_letter[letter][set_index]), letter) for letter in group]
            extra = next(letter for letter in letters[letters.index(group[-1]) + 1:] + letters if letter not in group and letter != "H")
            question = variation("1B", f"letras-{set_index + 1}-{number}", "Complete o nome de cada figura com a letra que falta.")
            items.append(match_missing(question, question["id"], rows, shuffled([*group, extra], question["id"]), question["enunciado"], "letra", "medio"))
    return items


def vowel_groups() -> list[dict]:
    """Variação de 3E com a vogal do meio: C_SA, B_LO... A pessoa ouve o nome e completa com a vogal certa."""
    words = [word for word in bank()["silabas_por_palavra"] if any(letter in VOWELS for letter in strip_marks(word)[1:])]
    items = []
    for number, group in enumerate(chunks(words, 3), 1):
        rows = []
        for word in group:
            plain = strip_marks(word)
            at = next(index for index in range(1, len(plain)) if plain[index] in VOWELS)
            rows.append(match_row(word, word[:at] + "_" + word[at + 1:], plain[at]))
        answers = list(dict.fromkeys(row["answer"] for row in rows))
        fillers = [vowel for vowel in VOWELS if vowel not in answers][: max(0, 3 - len(answers))]
        question = variation("3E", f"vogal-{number}", "Complete cada palavra com a vogal que falta.")
        items.append(match_missing(question, question["id"], rows, shuffled([*answers, *fillers], question["id"]), question["enunciado"], "vogal", "medio"))
    return items


def word_tracks() -> list[dict]:
    letter_lines = {question["id"].split("-", 1)[1].upper(): question["dados"]["linhas"] for question in questions("3E")}
    groups = ("ABCDE", "FGHIJ", "KLMNO", "PQRST", "UVWXYZ")
    initials = [initial_from_picture(question, f"bq-{question['id']}", question["dados"]["imagem"]["termo"], question["dados"]["opcoes"], question["enunciado"], "facil", question["dados"]["lacuna"])
                for question in questions("3A")]
    fits = [item for question in questions("3E") for item in word_cards(question, letter_lines)]
    links = [word_for_picture(question, f"bq-{question['id']}-{image['id']}", image["termo"], question["dados"]["opcoes"], "Toque na palavra que corresponde à imagem.", "medio")
             for question in questions("3B") for image in question["dados"]["imagens"]]
    named = [word_for_picture(question, f"bq-{question['id']}", question["gabarito"], question["dados"]["opcoes"], question["enunciado"], "dificil") for question in questions("3D")]
    drawings = [picture_for_word(question) for question in questions("3C")]
    by_group = lambda items, group: [item for item in items if initial(item["context_word"] or item["target_id"]) in group]  # noqa: E731
    units = [{"id": f"palavras-inicial-{index}", "kind": "word", "title": f"Letra inicial: {group[0]} a {group[-1]}", "required_letters": PHASES_1_2,
              "items": by_group(initials, group)} for index, group in enumerate(groups, 1)]
    units += [{"id": f"palavras-ligar-{index}", "kind": "word_image", "title": f"Imagem e palavra {index}", "required_letters": PHASES_1_2, "items": part}
              for index, part in enumerate(chunks(links, 12), 1)]
    units += [{"id": "palavras-desenho", "kind": "word_image", "title": "Qual é o desenho?", "required_letters": PHASES_1_2, "items": drawings},
              {"id": "palavras-nome", "kind": "word_image", "title": "Qual é a palavra?", "required_letters": PHASES_1_2, "items": named}]
    # Montar o nome com as letras embaralhadas: palavras das escolhas de imagem (3B, 3C, 3D) que não estão nas lições de letra.
    lesson_words = {question["dados"]["palavra"] for question in questions("1D")}
    to_build = list(dict.fromkeys([*bank()["silabas_por_palavra"], *(image["termo"] for question in questions("3B") for image in question["dados"]["imagens"]),
                                   *(image["termo"] for question in questions("3C") for image in question["dados"]["imagens"]), *(question["gabarito"] for question in questions("3D"))]))
    to_build = [word for word in to_build if word not in lesson_words and len(word) <= 9 and (word in EMOJI or word in SVG)]
    builds = [letters_to_word(variation("1D", f"montar-{strip_marks(word).lower()}", "Monte o nome do desenho com as letras."), f"var-1D-montar-{strip_marks(word).lower()}", word)
              for word in to_build]
    units += [{"id": f"palavras-montar-{index}", "kind": "word", "title": f"Monte a palavra {index}", "required_letters": PHASES_1_2, "items": part}
              for index, part in enumerate(chunks(builds, 8), 1)]
    units += [{"id": f"palavras-letra-falta-{index}", "kind": "word_image", "title": f"Figura e letra que falta {index}", "required_letters": PHASES_1_2, "items": part}
              for index, part in enumerate(chunks(letter_groups(), 8), 1)]
    units += [{"id": "palavras-vogal-falta", "kind": "word", "title": "Qual vogal falta?", "required_letters": PHASES_1_2, "items": vowel_groups()}]
    units += [{"id": f"palavras-completar-{index}", "kind": "word", "title": f"Complete com a letra: {group[0]} a {group[-1]}", "required_letters": PHASES_1_2,
               "items": [item for item in fits if item["payload"]["letter"] in group]} for index, group in enumerate(groups, 1)]
    return [{"id": "palavras", "slug": "palavras", "title": "Palavras", "kind": "theme", "position": 4,
             "description": "Nível 3: letra inicial, imagem e palavra, completar palavras.", "units": units}]


# --- Nível 4: Frases -------------------------------------------------------------------------------------------------

def sentence_id(text: str) -> str:
    return "frase-" + "-".join(strip_marks(text).lower().split())


def sentences() -> list[dict]:
    seen = []
    for question in questions("4A"):
        text = " ".join(question["gabarito"])
        seen.append({"id": sentence_id(text), "text": text, "image_alt": f"Cena: {text.lower()}.", "term": question["dados"]["imagem"]["termo"]})
    return seen


def order_sentence(question: dict) -> dict:
    text = " ".join(question["gabarito"])
    term = question["dados"]["imagem"]["termo"]
    visual = picture(term)
    return spec(f"bq-{question['id']}", ExerciseType.SENTENCE_ORDER, question["enunciado"], text, metadata(
        question, "Ordenar as palavras para formar a frase, usando o nome da figura.", "dificil", "As peças estão fora de ordem, sem seguir uma rotação.",
        f"Isso: {text}.", "Comece pela primeira palavra da frase com lacuna e siga a ordem.", tokens=question["dados"]["pecas"],
        context={"label": question["dados"]["frase_com_lacuna"], **emoji_of(visual)}, **asset_of(visual)), target_id=sentence_id(text), tts=question["dados"]["frase_com_lacuna"].replace("___", term), required=text)


def scene(question: dict) -> dict:
    text = question["gabarito"]
    visual = picture(text)
    return spec(f"bq-{question['id']}", ExerciseType.SENTENCE_IMAGE_CHOOSE, question["enunciado"], text, metadata(
        question, "Ler as frases e escolher a que descreve a cena.", "dificil", "As outras frases mudam só uma palavra (par mínimo).",
        f"Isso: {text}.", "Leia cada frase inteira e compare com a cena.", context={**emoji_of(visual), "image_label": f"Cena: {text.lower()}."}, **asset_of(visual)),
        options=question["dados"]["opcoes"], target_id=sentence_id(text), required=text)


def sentence_tracks() -> list[dict]:
    return [{"id": "frases", "slug": "frases", "title": "Frases", "kind": "theme", "position": 5,
             "description": "Nível 4: montar frases e escolher a frase da cena.", "units": [
                 {"id": "frases-montar", "kind": "sentence", "title": "Monte a frase", "required_letters": ALL_LETTERS, "items": [order_sentence(question) for question in questions("4A")]},
                 {"id": "frases-cena", "kind": "sentence_image", "title": "Frase da cena", "required_letters": ALL_LETTERS, "items": [scene(question) for question in questions("4B")]},
             ]}]


def theme_tracks() -> list[dict]:
    return [*syllable_tracks(), *word_tracks(), *sentence_tracks()]


def catalog_words() -> dict[str, list[str]]:
    """Palavras publicadas: todas as que aparecem como alvo ou opção de exercício de palavra ou sílaba."""
    used: set[str] = set()
    for track in theme_tracks():
        for unit in track["units"]:
            for item in unit["items"]:
                kind = item["type"]
                if kind in (ExerciseType.WORD_IMAGE_CHOOSE, ExerciseType.SYLLABLES_TO_WORD, ExerciseType.PICTURE_CHOOSE):
                    used.update(item["options"])
                if kind in (ExerciseType.SYLLABLE_POSITION_CHOOSE,):
                    used.add(item["payload"]["word"])
                if kind is ExerciseType.WORD_FROM_SYLLABLES:
                    used.add(item["target_id"])
    missing = sorted(word for word in used if word not in syllables_of())
    if missing:
        raise ValueError(f"Palavras sem separação silábica: {', '.join(missing)}")
    return {word: syllables_of()[word] for word in sorted(used)}


def word_difficulty(parts: list[str]) -> str:
    simple = all(len(strip_marks(part)) == 2 and strip_marks(part)[1] in "AEIOU" and strip_marks(part)[0] not in "AEIOU" for part in parts)
    return "facil" if simple and len(parts) <= 2 else "medio" if len(parts) <= 3 else "dificil"


