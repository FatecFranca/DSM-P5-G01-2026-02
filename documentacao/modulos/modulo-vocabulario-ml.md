# Módulo: Vocabulário e classificador lexical

> **Propósito:** descrever a curadoria lexical e o feedback humano sobre o classificador de
> dificuldade do **Prosa**.

Arquivos: [`apps/api/app/word_studio.py`](../../apps/api/app/word_studio.py) ·
[`apps/api/app/lexical_difficulty.py`](../../apps/api/app/lexical_difficulty.py) ·
manifesto em [`ml/artifacts/difficulty_manifest.json`](../../ml/artifacts/difficulty_manifest.json).

Documentos relacionados: [ADR 0005](../adr/0005-classificador-dificuldade-lexical.md) ·
[Módulo: Ranking](./modulo-ranking.md).

## Classificador (inferência pura)

`lexical_difficulty.py` implementa em Python puro a inferência do classificador
(`facil`/`medio`/`dificil`), sem depender do pacote `ml` em runtime:

- Extrai 9 features silábicas (`syllable_count`, `length`, acento, encontros consonantais,
  formas `CVC`/`CCV` etc., frequência).
- Regressão logística multinomial em Python puro (`_predict`), calibrada por softmax.
- `classify_word` devolve `None` se o manifesto estiver ausente **ou** sem
  `promotion_allowed` (fallback: `medio`).
- A curadoria em `content_data.WORDS` continua soberana sobre a predição.

## Endpoints (prefixo `/v1/admin/words`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | lista palavras com filtros `q`, `feedback`, `status` + contadores |
| GET | `/export-labels` | rótulos humanos no formato do treino (`difficulty_labels.json`) |
| POST | `/` | cria palavra candidata (silabifica se `syllables` omitido) |
| POST | `/{id}/predict` | reprediz dificuldade da palavra |
| POST | `/{id}/feedback` | registro de feedback humano |

## Ciclo de feedback humano

- `verdict=confirm` → confirma a predição do modelo (`label_feedback=confirmed`).
- `verdict=correct` + `difficulty` → humano corrige (`label_feedback=corrected`).
- `review_status` avança `candidate → pending` na primeira interação; `approved` só pela
  publicação via Estúdio.
- `export-labels` exporta `confirmed`/`corrected` com `source=human-feedback` para realimentar
  o treino.

## Criação de palavra

- `id` = UUIDv5 determinístico (`prosa:word:<texto>`).
- Valida texto português (≥ 2 letras, sem acento após `strip_marks`).
- Silabificação por `pyphen` (pt_BR) com fallback conservador (uma sílaba por vogal).
- Registra `required_letters`, `accented`, `length`, `frequency`, `initial_difficulty`,
  `model_difficulty`, `difficulty_rationale`.
