"""Prepara a carga do vocabulário tratado para public.words."""

import csv
import json
import unicodedata
import uuid
from collections import Counter
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[1]
PLANILHA_PADRAO = RAIZ / "pre-processamento" / "Corpus_SANTOS_TONI_FDC_tratado_sem_repeticoes.xlsx"
# Predições do corpus inteiro; os três modelos treinados com rótulos humanos (ml/artifacts) votam a dificuldade.
PREDICOES = RAIZ / "ml" / "reports" / "final_corpus_six_model_predictions.csv"
MODELOS_VOTANTES = ("PREDICAO_LR", "PREDICAO_LDA", "PREDICAO_SVM")
DIFICULDADES = {"facil", "medio", "dificil"}


def normalizar(texto):
    return unicodedata.normalize("NFC", texto.strip().upper())


def dificuldade_por_votacao(votos):
    """Maioria entre os votos válidos; empate fica em `medio`; sem voto, None (a carga usa `medio`)."""
    validos = [voto for voto in votos if voto in DIFICULDADES]
    if not validos:
        return None
    contagem = Counter(validos).most_common()
    if len(contagem) > 1 and contagem[0][1] == contagem[1][1]:
        return "medio"
    return contagem[0][0]


def ler_predicoes(caminho=PREDICOES):
    if not caminho.exists():
        return {}
    with caminho.open(encoding="utf-8", newline="") as arquivo:
        return {normalizar(linha["PALAVRA"]): dificuldade_por_votacao(linha.get(coluna) for coluna in MODELOS_VOTANTES)
                for linha in csv.DictReader(arquivo) if linha.get("PALAVRA")}


def ler_palavras(planilha):
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise ValueError("Instale openpyxl com: python -m pip install openpyxl") from exc

    livro = load_workbook(planilha, read_only=True, data_only=True)
    try:
        linhas = livro.active.values
        cabecalho = next(linhas, ())
        if "PALAVRA" not in cabecalho:
            raise ValueError("A aba ativa deve ter uma coluna PALAVRA.")
        coluna = cabecalho.index("PALAVRA")
        palavras = set()
        for numero, linha in enumerate(linhas, 2):
            valor = linha[coluna] if len(linha) > coluna else None
            if valor is None:
                continue
            if not isinstance(valor, str) or len(normalizar(valor)) > 40 or "\0" in valor:
                raise ValueError(f"Palavra incompatível com public.words na linha {numero}.")
            if palavra := normalizar(valor):
                palavras.add(palavra)
        if not palavras:
            raise ValueError("A planilha não contém palavras.")
        return sorted(palavras)
    finally:
        livro.close()


def carga_palavras(planilha, silabas_curadas, sql_texto):
    banco = json.loads((RAIZ / "apps/api/app/data/word_bank.json").read_text(encoding="utf-8"))
    silabas = {normalizar(entrada["text"]): entrada["syllables"].split("-") for entrada in banco}
    silabas.update({"".join(partes.split()): partes.split() for partes in silabas_curadas})
    contrato = json.loads((RAIZ / "contracts/pedagogy.json").read_text(encoding="utf-8"))
    ordem = contrato["learning_order"]
    predicoes = ler_predicoes()
    linhas = []
    for palavra in ler_palavras(planilha):
        partes = silabas.get(palavra, [])
        if not all(partes) or "".join(partes) != palavra:
            partes = []
        sem_acentos = "".join(c for c in unicodedata.normalize("NFD", palavra) if not unicodedata.combining(c))
        letras = "".join(c for c in ordem if c in sem_acentos)
        id_ = str(uuid.uuid5(uuid.NAMESPACE_URL, f"alfabetiza:word:{palavra}"))
        campos = ", ".join(map(sql_texto, (id_, palavra, letras, json.dumps(partes, ensure_ascii=False))))
        dificuldade = predicoes.get(palavra)
        linhas.append(f"({campos}, {'true' if sem_acentos != palavra else 'false'}, {sql_texto(dificuldade) if dificuldade else 'NULL'})")

    valores = ",\n".join(linhas)
    return f"""
CREATE TEMP TABLE prosa_palavras_importacao (
    id varchar(36), texto varchar(40), letras varchar(26), silabas json, acentuada boolean, dificuldade varchar(16)
) ON COMMIT DROP;

INSERT INTO prosa_palavras_importacao VALUES
{valores};

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'words' AND column_name = 'required_letters'
    ) THEN
        -- Candidatos recebem a dificuldade votada pelos modelos (ADR 0005); sem predição, `medio`.
        INSERT INTO public.words (
            id, text, syllables, required_letters, accented, length, initial_difficulty,
            current_difficulty, difficulty_rationale, model_difficulty, label_feedback, source, review_status, content_version
        )
        SELECT id, texto, silabas, letras, acentuada, char_length(texto), coalesce(dificuldade, 'medio'),
               coalesce(dificuldade, 'medio'),
               CASE WHEN dificuldade IS NULL THEN 'sem predição: valor inicial' ELSE 'votação LR/LDA/SVM (rótulos humanos)' END,
               dificuldade, CASE WHEN dificuldade IS NULL THEN NULL ELSE 'pending' END,
               'corpus-santos-toni', 'candidate', 1
        FROM prosa_palavras_importacao
        ON CONFLICT (text) DO NOTHING;

        -- Palavras já cadastradas: só candidatos sem predição recebem a do modelo; a curadoria continua soberana.
        UPDATE public.words AS w
        SET model_difficulty = carga.dificuldade, label_feedback = coalesce(w.label_feedback, 'pending')
        FROM prosa_palavras_importacao AS carga
        WHERE w.text = carga.texto AND w.review_status = 'candidate'
          AND w.model_difficulty IS NULL AND carga.dificuldade IS NOT NULL;
    ELSIF current_database() = 'prosa_laboratorio' THEN
        INSERT INTO public.words (id, text, syllables)
        SELECT id, texto, silabas FROM prosa_palavras_importacao
        ON CONFLICT (text) DO NOTHING;
    ELSE
        RAISE EXCEPTION 'Aplique as migrações do Prosa antes de importar a base tratada.';
    END IF;
END $$;

UPDATE public.words AS w
SET syllables = carga.silabas
FROM prosa_palavras_importacao AS carga
WHERE w.text = carga.texto
  AND COALESCE(w.syllables::jsonb, 'null'::jsonb) IN ('null'::jsonb, '[]'::jsonb)
  AND carga.silabas::jsonb <> '[]'::jsonb;
"""
