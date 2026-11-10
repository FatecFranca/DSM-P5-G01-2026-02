"""Prepara a carga do vocabulário tratado para public.words."""

import json
import unicodedata
import uuid
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[1]
PLANILHA_PADRAO = RAIZ / "pre-processamento" / "Corpus_SANTOS_TONI_FDC_tratado_sem_repeticoes.xlsx"


def normalizar(texto):
    return unicodedata.normalize("NFC", texto.strip().upper())


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
    linhas = []
    for palavra in ler_palavras(planilha):
        partes = silabas.get(palavra, [])
        if not all(partes) or "".join(partes) != palavra:
            partes = []
        sem_acentos = "".join(c for c in unicodedata.normalize("NFD", palavra) if not unicodedata.combining(c))
        letras = "".join(c for c in ordem if c in sem_acentos)
        id_ = str(uuid.uuid5(uuid.NAMESPACE_URL, f"alfabetiza:word:{palavra}"))
        campos = ", ".join(map(sql_texto, (id_, palavra, letras, json.dumps(partes, ensure_ascii=False))))
        linhas.append(f"({campos}, {'true' if sem_acentos != palavra else 'false'})")

    valores = ",\n".join(linhas)
    return f"""
CREATE TEMP TABLE prosa_palavras_importacao (
    id varchar(36), texto varchar(40), letras varchar(26), silabas json, acentuada boolean
) ON COMMIT DROP;

INSERT INTO prosa_palavras_importacao VALUES
{valores};

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'words' AND column_name = 'required_letters'
    ) THEN
        INSERT INTO public.words (
            id, text, syllables, required_letters, accented, length, initial_difficulty,
            current_difficulty, source, review_status, content_version
        )
        SELECT id, texto, silabas, letras, acentuada, char_length(texto), 'medio',
               'medio', 'corpus-santos-toni', 'candidate', 1
        FROM prosa_palavras_importacao
        ON CONFLICT (text) DO NOTHING;
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
