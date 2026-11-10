"""Classifica a dificuldade das palavras de um dataset com o modelo SVM salvo.

Exemplos (a partir de ml/):
  PYTHONPATH=src python -m alfabetiza_ml.classificar_dataset --entrada data/Corpus_SANTOS_TONI_FDC_tratado_sem_repeticoes_final.xlsx --saida reports/previsoes.csv
  PYTHONPATH=src python -m alfabetiza_ml.classificar_dataset --entrada ../apps/api/alfabetiza.db --tabela minha_tabela \
      --col-palavra palavra --col-estrutura estrutura_silabica --col-frequencia frequencia --saida reports/previsoes.csv
"""
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

import joblib
import pandas as pd

from .benchmark_human_ratings import features

ROOT = Path(__file__).resolve().parents[3]
MODELO_PADRAO = ROOT / "ml" / "artifacts" / "svm_dificuldade_humana.joblib"
COLUNAS = {"PALAVRA": "col_palavra", "ESTSILABICA": "col_estrutura", "FREQ": "col_frequencia"}


def ler_dataset(entrada: Path, tabela: str | None) -> pd.DataFrame:
    if entrada.suffix in {".xlsx", ".xls"}:
        return pd.read_excel(entrada)
    if entrada.suffix == ".csv":
        return pd.read_csv(entrada)
    if entrada.suffix in {".db", ".sqlite", ".sqlite3"}:
        if not tabela:
            raise SystemExit("Informe --tabela para ler um banco SQLite.")
        with sqlite3.connect(entrada) as conexao:
            return pd.read_sql_query(f'SELECT * FROM "{tabela}"', conexao)
    raise SystemExit(f"Formato não suportado: {entrada.suffix}")


def classificar(dados: pd.DataFrame, modelo_path: Path, mapa: dict[str, str]) -> pd.DataFrame:
    ausentes = [coluna for coluna in mapa.values() if coluna not in dados.columns]
    if ausentes:
        raise SystemExit(f"Colunas não encontradas no dataset: {ausentes}. Disponíveis: {list(dados.columns)}")
    entrada = dados.rename(columns={origem: destino for destino, origem in mapa.items()})
    entrada = entrada.dropna(subset=list(mapa)).copy()
    modelo = joblib.load(modelo_path)["model"]
    entrada["PREVISAO_DIFICULDADE"] = modelo.predict(features(entrada))
    return entrada


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--entrada", required=True, type=Path, help="Arquivo .xlsx, .csv ou banco SQLite")
    parser.add_argument("--tabela", help="Tabela do banco SQLite (obrigatória para .db)")
    parser.add_argument("--saida", required=True, type=Path, help="CSV com as previsões")
    parser.add_argument("--modelo", type=Path, default=MODELO_PADRAO)
    parser.add_argument("--col-palavra", default="PALAVRA")
    parser.add_argument("--col-estrutura", default="ESTSILABICA")
    parser.add_argument("--col-frequencia", default="FREQ")
    args = parser.parse_args()

    mapa = {"PALAVRA": args.col_palavra, "ESTSILABICA": args.col_estrutura, "FREQ": args.col_frequencia}
    resultado = classificar(ler_dataset(args.entrada, args.tabela), args.modelo, mapa)
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    resultado.to_csv(args.saida, index=False)
    print(f"{len(resultado)} palavras classificadas -> {args.saida}")
    print(resultado["PREVISAO_DIFICULDADE"].value_counts().to_string())


if __name__ == "__main__":
    main()
