import json
from pathlib import Path

from app.content_types import FIND_IN_WORD_EXEMPT_LETTERS, LEARNING_ORDER, LEGACY_ALIASES, PHASE_SPECS, RENDERER_OF, REQUIRED_LETTER_EXERCISE_TYPES, TARGET_OF, ExerciseType, normalize_exercise_type, required_types_for

CONTRACTS = Path(__file__).resolve().parents[3] / "contracts"


def load(name):
    return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))


def test_exercise_types_match_contract():
    contract = load("exercise-types.json")
    assert [item["id"] for item in contract["types"]] == [item.value for item in ExerciseType]
    assert contract["legacy_aliases"] == {key: value.value for key, value in LEGACY_ALIASES.items()}
    assert {item["id"]: item["target"] for item in contract["types"]} == {key.value: value.value for key, value in TARGET_OF.items()}
    assert {item["id"]: item["renderer"] for item in contract["types"]} == {key.value: value.value for key, value in RENDERER_OF.items()}
    assert set(contract["renderers"]) == {value.value for value in RENDERER_OF.values()}


def test_pedagogy_matches_contract():
    contract = load("pedagogy.json")
    assert LEARNING_ORDER == contract["learning_order"]
    assert [{"phase": phase, "title": title, "letters": letters} for phase, title, letters in PHASE_SPECS] == contract["phases"]
    assert [item.value for item in REQUIRED_LETTER_EXERCISE_TYPES] == contract["required_letter_exercise_types"]
    assert FIND_IN_WORD_EXEMPT_LETTERS == contract["find_in_word_exempt_letters"]


def test_legacy_type_normalization():
    assert normalize_exercise_type("recognize") is ExerciseType.RECOGNIZE_LETTER
    assert normalize_exercise_type("recognize_letter") is ExerciseType.RECOGNIZE_LETTER
    assert normalize_exercise_type("write") is None


def test_seed_only_emits_contract_types(client):
    content = client.get("/v1/content").json()
    units = [unit for track in content["tracks"] for unit in track["units"]]
    assert {item["type"] for unit in units for item in unit["items"]} <= {item.value for item in ExerciseType}
    for unit in (unit for unit in units if unit["kind"] == "letter"):
        assert {item.value for item in required_types_for(unit["focus_letter"])} <= {item["type"] for item in unit["items"]}, unit["focus_letter"]


def test_exercise_id_suffixes_match_contract():
    from app.content_types import EXERCISE_ID_SUFFIX
    contract = load("exercise-types.json")
    assert {item["id"]: item["id_suffix"] for item in contract["types"]} == {key.value: value for key, value in EXERCISE_ID_SUFFIX.items()}
