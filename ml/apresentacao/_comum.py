"""Utilidades compartilhadas pelos scripts de apresentação.

Execute os scripts a partir da pasta ml/, por exemplo:
  .venv/bin/python apresentacao/03_svm_conjunto_humano.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR / "src"))

import pandas as pd  # noqa: E402

from alfabetiza_ml.benchmark_human_ratings import (  # noqa: E402
    CORPUS,
    LABELS,
    consolidated_labels,
    features,
    models,
)

SAIDA = ML_DIR / "reports" / "apresentacao"
SEMENTE = 7
NOMES_CLASSES = {"facil": "fácil", "medio": "médio", "dificil": "difícil"}


def titulo(texto: str) -> None:
    print("\n" + "=" * 70)
    print(texto)
    print("=" * 70)


def conjunto_humano() -> tuple[pd.DataFrame, pd.DataFrame, pd.Series]:
    """Palavras rotuladas por humanos que existem no corpus final (339)."""
    corpus = pd.read_excel(CORPUS).drop_duplicates("PALAVRA")
    dados = consolidated_labels().merge(corpus, on="PALAVRA", how="inner").drop_duplicates("LEMA")
    dados = dados.reset_index(drop=True)
    return dados, features(dados), dados["DIFICULDADE"]


def corpus_completo() -> pd.DataFrame:
    return pd.read_excel(CORPUS).drop_duplicates("PALAVRA").reset_index(drop=True)


def tabela_matriz(matriz) -> pd.DataFrame:
    nomes = [NOMES_CLASSES[c] for c in LABELS]
    return pd.DataFrame(matriz, index=[f"real {n}" for n in nomes], columns=[f"previsto {n}" for n in nomes])


def desenhar_matriz(eixo, matriz, titulo_grafico: str) -> None:
    eixo.imshow(matriz, cmap="Blues")
    nomes = [NOMES_CLASSES[c] for c in LABELS]
    eixo.set_xticks(range(3), nomes)
    eixo.set_yticks(range(3), nomes)
    eixo.set_xlabel("previsto")
    eixo.set_ylabel("real")
    eixo.set_title(titulo_grafico)
    limite = matriz.max() / 2
    for i in range(3):
        for j in range(3):
            eixo.text(j, i, int(matriz[i][j]), ha="center", va="center", color="white" if matriz[i][j] > limite else "black")


def abrir(caminho: Path) -> None:
    if "--abrir" in sys.argv:
        subprocess.run(["open", str(caminho)], check=False)
