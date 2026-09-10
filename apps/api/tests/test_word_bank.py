from app.word_bank import load_word_bank


def test_word_bank_has_at_least_1000_filtered_words():
    words = load_word_bank()
    assert len(words) >= 1000
    assert words[0]["text"] == "QUE"
    assert any(item["text"] == "VOCÊ" for item in words)
    assert all(len(item["text"]) >= 3 for item in words)
    assert all(item["raw_frequency"] >= 10 for item in words)
