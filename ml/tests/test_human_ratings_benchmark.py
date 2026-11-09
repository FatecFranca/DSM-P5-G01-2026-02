from alfabetiza_ml.benchmark_human_ratings import LABELS, consolidated_labels, models


def test_consolidated_human_labels_are_valid_and_complete():
    labels = consolidated_labels()

    assert len(labels) == 349
    assert labels["PALAVRA"].is_unique
    assert set(labels["DIFICULDADE"]) == set(LABELS)


def test_benchmark_defines_the_six_required_models():
    assert set(models()) == {"LR", "LDA", "KNN", "CART", "NB", "SVM"}
