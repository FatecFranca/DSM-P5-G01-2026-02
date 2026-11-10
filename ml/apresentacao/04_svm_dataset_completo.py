"""Aplica o SVM salvo (.joblib) ao dataset principal inteiro (7.649 palavras)."""
import joblib
import pandas as pd

from _comum import ML_DIR, NOMES_CLASSES, SAIDA, SEMENTE, abrir, corpus_completo, features, titulo

modelo_path = ML_DIR / "artifacts" / "svm_dificuldade_humana.joblib"
svm = joblib.load(modelo_path)["model"]
print(f"Modelo carregado de: {modelo_path.relative_to(ML_DIR)}")
print("Etapas:", [type(etapa).__name__ for _, etapa in svm.steps])

corpus = corpus_completo()
corpus["PREVISAO_SVM"] = svm.predict(features(corpus))

titulo(f"SVM no dataset principal — {len(corpus)} palavras classificadas")
contagem = corpus["PREVISAO_SVM"].value_counts()
for classe in ("facil", "medio", "dificil"):
    quantidade = int(contagem.get(classe, 0))
    print(f"  {NOMES_CLASSES[classe]:8s} {quantidade:5d}  ({quantidade / len(corpus):.1%})")

titulo("Exemplos por classe (amostra fixa)")
colunas = ["PALAVRA", "ESTSILABICA", "FREQ", "PREVISAO_SVM"]
for classe in ("facil", "medio", "dificil"):
    exemplos = corpus[corpus["PREVISAO_SVM"] == classe].sample(8, random_state=SEMENTE)[colunas]
    print(f"\n[{NOMES_CLASSES[classe]}]")
    print(exemplos.to_string(index=False))

SAIDA.mkdir(parents=True, exist_ok=True)
destino = SAIDA / "svm_dataset_completo.csv"
corpus[colunas + ["LEMA"]].to_csv(destino, index=False)
print(f"\nResultado completo salvo em: {destino}")
abrir(destino)
