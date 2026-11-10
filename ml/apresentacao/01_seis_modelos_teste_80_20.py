"""Compara os seis modelos obrigatórios: 80% treino / 20% teste (68 palavras nunca vistas)."""
from _comum import SAIDA, abrir, titulo
import pandas as pd

from alfabetiza_ml.benchmark_human_ratings import run

relatorio = run()
titulo("Seis modelos — teste 80/20 com rótulos humanos")
print(f"Palavras humanas: {relatorio['dataset_rows']} | classes: {relatorio['class_counts']}")
print(f"Treino: {relatorio['train_rows']} | Teste: {relatorio['test_rows']}\n")

tabela = pd.DataFrame(relatorio["results"])[["model", "accuracy", "macro_f1"]]
tabela[["accuracy", "macro_f1"]] = (tabela[["accuracy", "macro_f1"]] * 100).round(2)
tabela.columns = ["Modelo", "Accuracy (%)", "Macro-F1 (%)"]
print(tabela.to_string(index=False))
print(f"\nVencedor (maior Macro-F1): {tabela.iloc[0]['Modelo']}")

SAIDA.mkdir(parents=True, exist_ok=True)
destino = SAIDA / "seis_modelos_teste_80_20.csv"
tabela.to_csv(destino, index=False)
print(f"\nTabela salva em: {destino}")
abrir(destino)
