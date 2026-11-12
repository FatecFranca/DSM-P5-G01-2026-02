import copy

from app.content_lint import lint_content


def units_by_id(body):
    return {unit["id"]: unit for track in body["tracks"] for unit in track["units"]}


def by_id(body, item_id):
    return next(entry for track in body["tracks"] for unit in track["units"] for entry in unit["items"] if entry["id"] == item_id)


def test_seeded_content_passes_lint(client):
    assert lint_content(client.get("/v1/content").json()) == []


def test_letter_units_follow_the_question_bank(client):
    body = client.get("/v1/content").json()
    letter_units = {unit["focus_letter"]: unit for unit in units_by_id(body).values() if unit["kind"] == "letter"}
    for letter, unit in letter_units.items():
        types = [entry["type"] for entry in unit["items"]]
        # 1E abre a lição; 1A e 1D trazem as duas palavras da letra; 1C entra de B a Y.
        assert types[0] == "listen_choose" and unit["items"][0]["payload"]["difficulty"] == "introducao"
        assert types.count("letters_to_word") == 2
        assert types.count("alphabet_neighbors") == (0 if letter in "AZ" else 1)
        for entry in unit["items"]:
            assert {"pedagogical_objective", "difficulty", "anti_elimination_rationale", "feedback", "review", "source"} <= set(entry["payload"])
            assert entry["payload"]["review"]["status"] == "pending_human_review"
            assert entry["payload"]["source"]["bank"] == "bancoquestoesequiz"
            assert entry["answer"] not in entry["instruction"].split()
    abelha = by_id(body, "bq-1A-abelha")
    assert abelha["options"] == ["A", "E", "I"] and abelha["payload"]["context"]["masked_word"] == "_BELHA" and abelha["payload"]["context"]["image"] == "🐝"
    assert abelha["instruction"] == "Selecione a vogal inicial do nome do desenho."
    # Ligar figuras às letras (1B): as figuras com o nome sem a letra inicial, na lição que fecha as letras do grupo.
    match = by_id(body, "bq-1B-relogio")
    assert match in letter_units["B"]["items"] and match["options"] == ["B", "O", "R", "S"] and match["answer"] == "R,S,B,O"
    assert [row["masked"] for row in match["payload"]["rows"]] == ["_ELÓGIO", "_APATO", "_OLSA", "_CULOS"]
    neighbors = by_id(body, "bq-1C-e")
    assert neighbors["answer"] == "D E F" and sorted(neighbors["options"]) == ["C E G", "D E F", "F E D"]
    # 1D vira montar o nome do desenho com as letras embaralhadas.
    build = by_id(body, "bq-1D-bolsa")
    assert build["type"] == "letters_to_word" and build["answer"] == "BOLSA" and sorted(build["payload"]["tokens"]) == sorted("BOLSA") and build["payload"]["tokens"] != list("BOLSA")
    assert "BOLSA" not in build["instruction"] and build["payload"]["context"]["image"] == "👜"


def test_levels_two_to_four_use_the_question_bank(client):
    body = client.get("/v1/content").json()
    units = units_by_id(body)
    assert [entry["id"] for entry in units["silabas-m"]["items"]] == ["bq-2F-ma", "bq-2F-me", "bq-2F-mi", "bq-2F-mo", "bq-2F-mu"]
    assert by_id(body, "bq-2F-ma")["options"] == ["BA", "NE", "MA", "PU"]
    sorvete = by_id(body, "bq-2B-sorvete-inicial")
    assert sorvete["answer"] == "SOR" and sorvete["payload"]["context"]["masked_word"] == "___ VE TE" and len(sorvete["options"]) == 3
    navio = by_id(body, "bq-2C-navio")
    assert navio["options"] == ["VI", "VA", "PE", "NA", "RA"] and navio["answer"] == "NA"
    camelo = by_id(body, "bq-2D-camelo")
    assert camelo["answer"] == "CA-ME-LO" and sorted(camelo["payload"]["tokens"]) == ["CA", "LO", "ME"] and "CAMELO" not in camelo["instruction"]
    casa = by_id(body, "bq-2A-casa")
    assert casa["type"] == "match_missing" and casa["answer"] == "CA,DA,BO" and [row["masked"] for row in casa["payload"]["rows"]] == ["___ SA", "___ DO", "___ LO"]
    assert len(units["silabas-completar-final"]["items"]) == 6 and len(units["palavras-vogal-falta"]["items"]) == 6
    banana = by_id(body, "bq-2E-banana")
    assert banana["answer"] == "BANANA" and banana["payload"]["context"]["label"] == "BA + NA + NA" and "BANANA" in banana["options"]
    assert by_id(body, "bq-3D-maca")["options"] == ["BANANA", "MÃOS", "MEIA", "MAÇÃ", "PERA"]
    folha = by_id(body, "bq-3C-folha")
    assert folha["answer"] == "FOLHA" and set(folha["payload"]["option_images"]) == {"FOLHA", "CHAMA", "FOCA"}
    fit = by_id(body, "bq-3E-u-uva")
    assert fit["answer"] == "uva" and sum(card["word"][0] == "U" for card in fit["word_choices"]) == 1
    order = by_id(body, "bq-4A-a-laranja-e-uma-fruta")
    assert order["payload"]["tokens"] == ["FRUTA", "A", "UMA", "É", "LARANJA"] and order["payload"]["context"]["label"] == "A ___ É UMA FRUTA"
    scene = by_id(body, "bq-4B-a-menina-brinca-no-balanco")
    assert sorted(scene["options"]) == ["A MENINA BRINCA NO BALANÇO", "A MENINA GOSTA DE CHOCOLATE", "A MENINA NADA"]
    # Portões: nível 2–3 abre com as fases 1–2 (crédito do nivelamento); nível 4, com as 26 letras.
    assert units["silabas-completar"]["required_letters"] == "AEIOUMLPSTRNDCG"
    assert units["silabas-b"]["required_letters"] == "AEIOUMLPSTRNDCGB"
    assert units["frases-cena"]["required_letters"] == "AEIOUMLPSTRNDCGBFVHQJKZXWY"


def test_lint_rejects_broken_adaptations(client):
    body = copy.deepcopy(client.get("/v1/content").json())
    by_id(body, "bq-2B-casa-final")["answer"] = "CA"
    by_id(body, "bq-3D-casa")["options"][1] = by_id(body, "bq-3D-casa")["options"][0]
    by_id(body, "bq-1D-abelha")["payload"]["tokens"] = list("ABELHA")
    by_id(body, "bq-1B-relogio")["payload"]["rows"][0]["masked"] = "R_LÓGIO"
    by_id(body, "bq-1A-martelo")["options"] = ["M", "M", "N"]
    by_id(body, "bq-1C-b")["answer"] = "C B A"
    build = by_id(body, "bq-2D-panela")
    build["payload"]["tokens"] = build["answer"].split("-")
    by_id(body, "bq-2E-casa")["options"].append("JANELAS")
    for card in by_id(body, "bq-3E-a-anjo")["word_choices"]:
        card["word"], card["before"], card["after"] = "A" + card["word"][1:], "", card["word"][1:]
    errors = lint_content(body)
    assert any("posição pedida" in error for error in errors)
    assert any("palavras distintas publicadas" in error for error in errors)
    assert any("fora de ordem" in error for error in errors)
    assert any("lacuna de RELÓGIO" in error for error in errors)
    assert any("letra inicial de MARTELO" in error for error in errors)
    assert any("letra anterior" in error for error in errors)
    assert any("tokens devem ser as sílabas da resposta em outra ordem" in error for error in errors)
    assert any("palavra JANELAS não está no catálogo publicado" in error for error in errors)
    assert any("exatamente uma palavra deve se completar com A" in error for error in errors)


def test_lint_rejects_revealed_answers_and_unknown_images(client):
    body = copy.deepcopy(client.get("/v1/content").json())
    by_id(body, "bq-1A-abelha")["instruction"] = "Selecione A vogal inicial."
    by_id(body, "bq-2B-casa-inicial")["payload"]["image_asset"] = "images/unknown.svg"
    by_id(body, "bq-1A-anjo")["payload"]["context"]["masked_word"] = "ANJO"
    errors = lint_content(body)
    assert any("revela a resposta A" in error for error in errors)
    assert any("ativo conhecido" in error for error in errors)
    assert any("esconder a resposta" in error for error in errors)
