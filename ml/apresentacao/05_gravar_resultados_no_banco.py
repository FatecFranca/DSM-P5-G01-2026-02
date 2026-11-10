"""Grava os resultados no SQLite (apps/api/alfabetiza.db) para visualizar no DBeaver.

Cria/atualiza apenas as tabelas ml_experiment_runs e ml_word_predictions.
As tabelas do aplicativo não são alteradas.
"""
import json
import sqlite3

from _comum import ML_DIR, corpus_completo, conjunto_humano, features, models, titulo
from alfabetiza_ml.benchmark_human_ratings import run

BANCO = ML_DIR.parent / "apps" / "api" / "alfabetiza.db"
RUN_ID = "dificuldade-lexical-svm-v1"
ORDEM = ("LR", "LDA", "KNN", "CART", "NB", "SVM")

relatorio = run()
vencedor = relatorio["results"][0]
_, X, y = conjunto_humano()
corpus = corpus_completo()
X_corpus = features(corpus)
for nome in ORDEM:
    corpus[f"p_{nome}"] = models()[nome].fit(X, y).predict(X_corpus)
corpus["concordancia"] = corpus[[f"p_{n}" for n in ORDEM]].apply(lambda linha: linha.value_counts().iloc[0], axis=1)

with sqlite3.connect(BANCO) as conexao:
    conexao.executescript(
        """
        CREATE TABLE IF NOT EXISTS ml_experiment_runs (
            run_id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            corpus_rows INTEGER NOT NULL, labeled_rows INTEGER NOT NULL, train_rows INTEGER NOT NULL, test_rows INTEGER NOT NULL,
            winner_model TEXT NOT NULL, winner_accuracy REAL NOT NULL, winner_macro_f1 REAL NOT NULL,
            features_json TEXT NOT NULL, evaluation_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS ml_word_predictions (
            run_id TEXT NOT NULL, palavra TEXT NOT NULL, lema TEXT, estrutura_silabica TEXT, acentuacao TEXT, frequencia REAL,
            predicao_lr TEXT NOT NULL, predicao_lda TEXT NOT NULL, predicao_knn TEXT NOT NULL, predicao_cart TEXT NOT NULL,
            predicao_nb TEXT NOT NULL, predicao_svm TEXT NOT NULL, predicao_selecionada TEXT NOT NULL, concordancia_modelos INTEGER NOT NULL,
            PRIMARY KEY (run_id, palavra), FOREIGN KEY (run_id) REFERENCES ml_experiment_runs(run_id));
        """
    )
    conexao.execute("DELETE FROM ml_word_predictions WHERE run_id = ?", (RUN_ID,))
    conexao.execute("DELETE FROM ml_experiment_runs WHERE run_id = ?", (RUN_ID,))
    conexao.execute(
        "INSERT INTO ml_experiment_runs (run_id, corpus_rows, labeled_rows, train_rows, test_rows, winner_model, winner_accuracy, winner_macro_f1, features_json, evaluation_json) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (RUN_ID, len(corpus), relatorio["dataset_rows"], relatorio["train_rows"], relatorio["test_rows"], vencedor["model"],
         vencedor["accuracy"], vencedor["macro_f1"], json.dumps(relatorio["features"], ensure_ascii=False),
         json.dumps(relatorio["results"], ensure_ascii=False)),
    )
    conexao.executemany(
        "INSERT INTO ml_word_predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            (RUN_ID, r.PALAVRA, r.LEMA, r.ESTSILABICA, r.ACENTUACAO, float(r.FREQ), r.p_LR, r.p_LDA, r.p_KNN, r.p_CART,
             r.p_NB, r.p_SVM, r.p_SVM, int(r.concordancia))
            for r in corpus.itertuples(index=False)
        ],
    )
    resumo = conexao.execute(
        "SELECT predicao_selecionada, COUNT(*) FROM ml_word_predictions WHERE run_id = ? GROUP BY 1 ORDER BY 2 DESC", (RUN_ID,)
    ).fetchall()
    execucao = conexao.execute(
        "SELECT corpus_rows, labeled_rows, train_rows, test_rows, winner_model, ROUND(winner_accuracy*100,2), ROUND(winner_macro_f1*100,2) FROM ml_experiment_runs WHERE run_id = ?",
        (RUN_ID,),
    ).fetchone()

titulo("Resultados gravados no banco")
print(f"Banco: {BANCO}")
print(f"Execução {RUN_ID}: palavras={execucao[0]} rotuladas={execucao[1]} treino={execucao[2]} teste={execucao[3]} "
      f"vencedor={execucao[4]} accuracy={execucao[5]}% macro_f1={execucao[6]}%")
print("Previsões do SVM:", dict(resumo))
print("\nNo DBeaver: atualize a conexão (F5) e abra as tabelas ml_experiment_runs e ml_word_predictions.")
