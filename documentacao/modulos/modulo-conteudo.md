# Módulo: Catálogo e conteúdo

> **Propósito:** descrever como o **Prosa** modela, serve e valida o catálogo pedagógico
> server-driven.

Arquivos: [`apps/api/app/content.py`](../../apps/api/app/content.py) ·
[`content_data.py`](../../apps/api/app/content_data.py) ·
[`content_types.py`](../../apps/api/app/content_types.py) ·
[`content_ids.py`](../../apps/api/app/content_ids.py) ·
[`content_lint.py`](../../apps/api/app/content_lint.py) ·
[`seed.py`](../../apps/api/app/seed.py).

Documentos relacionados: [04 — Arquitetura](../04-arquitetura-prosa.md) ·
[06 — Banco de dados](../06-banco-de-dados.md) · [ADR 0001](../adr/0001-conteudo-server-driven.md) ·
[ADR 0002](../adr/0002-modelo-de-conteudo.md).

## Responsabilidades

- **Fonte da verdade:** `content_data.py` é o catálogo curado à mão (letras, palavras,
  frases, trilhas).
- **Servir:** `GET /v1/content` monta o bundle a partir do banco (ou do snapshot publicado
  pelo Estúdio) e calcula o `ETag` (SHA-256) com suporte a `If-None-Match` (304).
- **Publicar:** só entram no bundle entidades com `review_status` em `pending`/`approved`
  (`PUBLISHED`).
- **Validar:** `content_lint.py` aplica as regras pedagógicas; `apps/mobile/src/content/schema.ts`
  espelha a mesma validação no cliente.
- **Seed:** `seed.py` é idempotente; itens que saem do catálogo viram `retired` (não são
  apagados).

## Estrutura do bundle

```json
{
  "version": "<16 chars do checksum>",
  "learning_order": "AEIOUMLPSTRNDCGBFVHQJKZXWY",
  "tracks": [ { "id", "slug", "title", "kind", "units": [ { "id", "kind", "items": [...] } ] } ],
  "words": [ ... ], "sentences": [ ... ], "syllables": [ ... ], "assets": [ ... ]
}
```

## Trilhas publicadas

| ID | Slug | Tipo | Descrição |
|---|---|---|---|
| `alphabet` | `alfabeto` | phonics | 26 letras em ordem progressiva |
| `casa` | `tem-em-casa` | theme | palavras e frases da casa |
| `familia` | `familia` | theme | palavras do cotidiano familiar (inicial) |

## IDs canônicos

- Unidade de letra: `lesson-<LETRA>`.
- Item de letra: `exercise-<LETRA>-<sufixo>`.
- Item temático: `item-<unidade>-<n>`.
- Palavra: UUIDv5 determinístico.
- Sílabas: o próprio texto.

IDs legados (`letter-a`, `A-listen`, `recognize`, `find_in_word`) são traduzidos por
`content_ids.py` (`canonical_lesson_id`/`canonical_exercise_id`).

## Invariantes validadas (resumo)

- Ordem de aprendizagem e fases corretas.
- `required_letters` consistentes (portão pedagógico).
- Sete habilidades-base por lição de letra (+ prática silábica quando aplicável).
- Metadados pedagógicos obrigatórios (`pedagogical_objective`, `difficulty`,
  `anti_elimination_rationale`, `feedback`, `review`).
- Imagens com `image_asset`, `image_alt`, `license` e `attribution` conhecidos.
