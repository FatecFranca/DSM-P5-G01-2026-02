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
    complete = [item(unit, "complete_word") for letter, unit in letter_units.items() if letter not in "AEIOUM"]
    assert len(complete) == 20 and not any(entry["type"] == "complete_word" for letter in "AEIOUM" for entry in letter_units[letter]["items"])
    assert {[choice["id"] for choice in entry["word_choices"]].index(entry["answer"]) for entry in complete} == {0, 1}
    syllable = [item(unit, "syllable_listen_choose") for letter, unit in letter_units.items() if letter in "MLPSTRNDCGBFVZJ"]
    assert len(syllable) == 15 and {entry["options"].index(entry["answer"]) for entry in syllable} == {0, 1}
    assert all(entry["tts_fallback_text"] == entry["answer"] for entry in syllable)
    assert not any(entry["type"] == "syllable_listen_choose" for letter in "AEIOUHQKWXY" for entry in letter_units[letter]["items"])


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
    find_i = item(units["lesson-I"], "find_in_word")
    find_i.update(context_word="PIPA", options=["1ª posição", "2ª posição", "3ª posição", "4ª posição"], answer="2ª posição")
    item(units["lesson-L"], "complete_word")["word_choices"].append({"id": "lama", "word": "LAMA", "before": "", "after": "AMA"})
    item(units["lesson-M"], "syllable_listen_choose")["options"][0] = "BA"
    build = next(entry for entry in units["casa-1"]["items"] if entry["type"] == "word_from_syllables")
    build["payload"]["tokens"] = build["answer"].split("-")
    fill = next(entry for entry in units["casa-frases"]["items"] if entry["type"] == "sentence_fill_word")
    fill["options"].append("JANELA")
    errors = lint_content(body)
    assert any("PIPA usa letra ainda não apresentada (P)" in error for error in errors)
    assert any("exatamente uma opção deve ser completada por L" in error for error in errors)
    assert any("BA usa letra ainda não apresentada (B)" in error for error in errors)
    assert any("tokens devem ser as sílabas da resposta em outra ordem" in error for error in errors)
    assert any("palavra JANELA não está no catálogo publicado" in error for error in errors)
