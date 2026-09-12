import copy

from app.content_lint import lint_content


def units_by_id(body):
    return {unit["id"]: unit for track in body["tracks"] for unit in track["units"]}


def item(unit, kind):
    return next(entry for entry in unit["items"] if entry["type"] == kind)


def test_seeded_content_passes_lint(client):
    assert lint_content(client.get("/v1/content").json()) == []


def test_letter_units_have_unambiguous_exercises(client):
    units = units_by_id(client.get("/v1/content").json())
    letter_units = {unit["focus_letter"]: unit for unit in units.values() if unit["kind"] == "letter"}
    complete = [item(unit, "complete_word") for unit in letter_units.values()]
    assert len(complete) == 26
    assert all(entry["answer"] in entry["options"] and len(set(entry["options"])) == 3 and entry["word_choices"] is None for entry in complete)
    expected = {"listen_choose", "recognize_letter", "initial_sound", "find_all_in_word", "compare_words", "complete_word", "mixed_review"}
    assert all(len(unit["items"]) == 7 and {entry["type"] for entry in unit["items"]} == expected for unit in letter_units.values())
    for unit in letter_units.values():
        for entry in unit["items"]:
            assert {"pedagogical_objective", "difficulty", "anti_elimination_rationale", "feedback", "review"} <= set(entry["payload"])
            assert entry["payload"]["review"]["status"] == "pending_human_review"
            assert entry["payload"]["feedback"]["correct"] and entry["payload"]["feedback"]["incorrect"]
            assert entry["answer"] not in entry["instruction"].split()
        for kind in ("listen_choose", "initial_sound", "complete_word", "mixed_review"):
            entry = item(unit, kind)
            context = entry["payload"]["context"]
            assert context["hide_word"] is True and context["inline_audio"] is True
            assert context["masked_word"].count("_") == 1
            assert entry["context_word"] not in entry["instruction"]


def test_theme_track_is_gated_by_letters_not_by_track(client):
    body = client.get("/v1/content").json()
    units = units_by_id(body)
    casa = units["casa-1"]
    assert casa["required_letters"] == "AEMLSC" and all(entry["required_letters"] in ("ASC", "AEMS", "AMC", "ALS") for entry in casa["items"])
    assert {entry["type"] for entry in casa["items"]} == {"word_listen_choose", "word_from_syllables"}
    build = next(entry for entry in casa["items"] if entry["type"] == "word_from_syllables" and entry["target_id"] == "CASA")
    assert build["answer"] == "CA-SA" and build["payload"]["tokens"] == ["SA", "CA"] and build["tts_fallback_text"] == "CASA"
    frases = units["casa-frases"]
    fill = next(entry for entry in frases["items"] if entry["type"] == "sentence_fill_word")
    assert fill["payload"]["sentence"] == "EU DURMO NA ___" and fill["answer"] == "CAMA" and fill["options"] == ["CAMA", "COPO", "PORTA"]
    order = next(entry for entry in frases["items"] if entry["type"] == "sentence_order")
    assert sorted(order["payload"]["tokens"]) == sorted(order["answer"].split(" ")) and order["payload"]["tokens"] != order["answer"].split(" ")
    assert set(frases["required_letters"]) >= set("EUDRMNAC")
    assert {sentence["id"] for sentence in body["sentences"]} == {"casa-frase-1", "casa-frase-2", "casa-frase-3", "casa-frase-4", "casa-frase-5"}
    assert {"MA", "CA", "SA", "PRA", "POR"} <= {syllable["id"] for syllable in body["syllables"]}


def test_lint_rejects_future_letters_ambiguous_choices_and_broken_theme_items(client):
    body = copy.deepcopy(client.get("/v1/content").json())
    units = units_by_id(body)
    find_i = item(units["lesson-I"], "find_all_in_word")
    find_i["payload"]["target_indices"] = [2]
    item(units["lesson-L"], "complete_word")["payload"]["context"]["masked_word"] = "LATA"
    item(units["lesson-M"], "initial_sound")["options"] = ["M", "M", "N"]
    build = next(entry for entry in units["casa-1"]["items"] if entry["type"] == "word_from_syllables")
    build["payload"]["tokens"] = build["answer"].split("-")
    fill = next(entry for entry in units["casa-frases"]["items"] if entry["type"] == "sentence_fill_word")
    fill["options"].append("JANELA")
    errors = lint_content(body)
    assert any("deve marcar exatamente todas as ocorrências" in error for error in errors)
    assert any("lacuna deve formar a palavra" in error for error in errors)
    assert any("três letras distintas" in error for error in errors)
    assert any("tokens devem ser as sílabas da resposta em outra ordem" in error for error in errors)
    assert any("palavra JANELA não está no catálogo publicado" in error for error in errors)
