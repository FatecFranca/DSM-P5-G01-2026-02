# ADR 0005 — Classificador supervisionado de dificuldade lexical

> **Propósito:** registrar a decisão do classificador supervisionado de dificuldade lexical do
> **Prosa**. Reprodução fiel de [`docs/adr/0005-classificador-dificuldade-lexical.md`](../../docs/adr/0005-classificador-dificuldade-lexical.md).

Data: 2026-10-18 · Status: **aceito**.

Documentos relacionados: [Módulo: Vocabulário e classificador lexical](../modulos/modulo-vocabulario-ml.md) ·
[ADR 0004](./0004-reabertura-de-ml-como-ranking.md).

## Contexto

A proposta do Prosa prevê um classificador supervisionado que rotula palavras em `facil`, `medio`
e `dificil` a partir de características silábicas, alimentando a organização do banco e, em
conjunto com o desempenho, a seleção de atividades.

O ranking (ADR 0004) prevê `p_recall` e **não** classifica dificuldade. As regras em `tabular.py`
eram apenas bootstrap.

## Decisão

1. Treinar regressão logística multinomial sobre features silábicas explícitas (`syllable_count`,
   encontros consonantais, formas CVC/CCV, acento, frequência).
2. Rotular o conjunto de treino em `ml/data/difficulty_labels.json` (curadoria + rótulos
   pedagógicos).
3. Promover o manifesto só com macro-F1 ≥ 0,70 em validação cruzada estratificada.
4. Aplicar o manifesto promovido aos **candidatos** do word bank; palavras curadas em
   `content_data.WORDS` permanecem soberanas.
5. Manter o ranking (ADR 0004) como mecanismo online de ordenação; a dificuldade lexical entra
   como atributo/prior, não como substituto do ranking.

## Consequências

- Artigo e código passam a compartilhar o mesmo eixo de ML lexical.
- Regenerar o word bank (`build_word_bank.py`) ou `relabel_word_bank` atualiza candidatos sem tocar
  no catálogo publicado.
- Sem manifesto promovido, o fallback de regras bootstrap permanece ativo.
