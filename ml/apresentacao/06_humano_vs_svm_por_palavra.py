"""Compara, palavra por palavra, o veredito humano com a previsão do SVM (339 palavras).

A previsão de cada palavra vem de um SVM que NÃO a viu no treino (validação cruzada de 10 partes).
Gera CSV, planilha Excel e a tabela ml_conjunto_humano_comparacao no banco (para o DBeaver).
"""
import sqlite3

from sklearn.model_selection import StratifiedKFold, cross_val_predict

from _comum import ML_DIR, NOMES_CLASSES, SAIDA, SEMENTE, abrir, conjunto_humano, models, titulo

BANCO = ML_DIR.parent / "apps" / "api" / "alfabetiza.db"
RUN_ID = "dificuldade-lexical-svm-v1"

dados, X, y = conjunto_humano()
validacao = StratifiedKFold(n_splits=10, shuffle=True, random_state=SEMENTE)
previsto = cross_val_predict(models()["SVM"], X, y, cv=validacao)

comparacao = dados[["PALAVRA", "LEMA", "ESTSILABICA", "FREQ", "DIFICULDADE"]].copy()
comparacao = comparacao.rename(columns={"DIFICULDADE": "HUMANO"})
comparacao["PREVISAO_SVM"] = previsto
comparacao["ACERTOU"] = (comparacao["HUMANO"] == comparacao["PREVISAO_SVM"]).map({True: "sim", False: "não"})
comparacao = comparacao.sort_values(["ACERTOU", "HUMANO", "PALAVRA"], ascending=[True, True, True]).reset_index(drop=True)

SAIDA.mkdir(parents=True, exist_ok=True)
csv_path = SAIDA / "conjunto_humano_vs_svm.csv"
xlsx_path = SAIDA / "conjunto_humano_vs_svm.xlsx"
comparacao.to_csv(csv_path, index=False)
comparacao.to_excel(xlsx_path, index=False, sheet_name="Humano vs SVM")

with sqlite3.connect(BANCO) as conexao:
    conexao.execute("DROP TABLE IF EXISTS ml_conjunto_humano_comparacao")
    banco = comparacao.rename(columns=str.lower).assign(run_id=RUN_ID)
    banco.to_sql("ml_conjunto_humano_comparacao", conexao, index=False)

acertos = int((comparacao["ACERTOU"] == "sim").sum())
titulo(f"Humano x SVM — {len(comparacao)} palavras")
print(f"Acertos: {acertos} de {len(comparacao)} ({acertos / len(comparacao):.2%})")
print("\nAcertos por classe humana:")
for classe in ("facil", "medio", "dificil"):
    parte = comparacao[comparacao["HUMANO"] == classe]
    ok = int((parte["ACERTOU"] == "sim").sum())
    print(f"  {NOMES_CLASSES[classe]:8s} {ok:3d} de {len(parte):3d} ({ok / len(parte):.1%})")

erros = comparacao[comparacao["ACERTOU"] == "não"]
print(f"\nPrimeiros erros (total {len(erros)}):")
print(erros[["PALAVRA", "ESTSILABICA", "HUMANO", "PREVISAO_SVM"]].head(15).to_string(index=False))
print(f"\nArquivos: {csv_path}\n          {xlsx_path}\nTabela no banco: ml_conjunto_humano_comparacao (atualize com F5 no DBeaver)")
abrir(xlsx_path)
