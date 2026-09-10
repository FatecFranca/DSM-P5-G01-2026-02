import copy

from app.content_lint import lint_content


def lessons_by_letter(body):
    return {lesson["letter"]: lesson for module in body["modules"] for lesson in module["lessons"]}


def exercise(lesson, kind):
    return next(item for item in lesson["exercises"] if item["type"] == kind)


def test_seeded_content_passes_lint(client):
    assert lint_content(client.get("/v1/content").json()) == []


def test_complete_word_is_unambiguous_and_answer_position_varies(client):
    lessons = lessons_by_letter(client.get("/v1/content").json())
    complete = [exercise(lesson, "complete_word") for lesson in lessons.values() if any(item["type"] == "complete_word" for item in lesson["exercises"])]
    assert len(complete) == 20 and not any(item["type"] == "complete_word" for letter in "AEIOUM" for item in lessons[letter]["exercises"])
    assert {[choice["id"] for choice in item["word_choices"]].index(item["answer"]) for item in complete} == {0, 1}


def test_lint_rejects_future_letters_and_ambiguous_choices(client):
    body = copy.deepcopy(client.get("/v1/content").json())
    lessons = lessons_by_letter(body)
    find_i = exercise(lessons["I"], "find_in_word")
    find_i.update(context_word="PIPA", options=["1ª posição", "2ª posição", "3ª posição", "4ª posição"], answer="2ª posição")
    exercise(lessons["L"], "complete_word")["word_choices"].append({"id": "lama", "word": "LAMA", "before": "", "after": "AMA"})
    errors = lint_content(body)
    assert any("PIPA usa letra ainda não apresentada (P)" in error for error in errors)
    assert any("exatamente uma opção deve ser completada por L" in error for error in errors)
