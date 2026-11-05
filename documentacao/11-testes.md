# Prosa — Testes

> **Propósito:** descrever a estratégia de testes do **Prosa**, como executá-los e o que
> está coberto.

Documentos relacionados: [08 — Guia de instalação](08-guia-de-instalacao.md) ·
[14 — Roadmap e lacunas](14-roadmap-e-lacunas.md).

## Estratégia

Três suítes independentes, alinhadas às três aplicações:

| Suíte | Framework | Localização | Foco |
|---|---|---|---|
| API | pytest | `apps/api/tests/` | autenticação, contrato, sync, conteúdo, ranking, placar, estúdio |
| Mobile | Vitest | `apps/mobile/src/**/*.test.ts` | domínio puro, contrato, cache, fila de sync |
| ML | pytest | `ml/tests/` | replay sem vazamento, gate de promoção, classificador |

## Execução

```bash
# API
cd apps/api && .venv/bin/python -m pytest

# Mobile
cd apps/mobile && npm test          # vitest run
cd apps/mobile && npm run typecheck # tsc --noEmit
cd apps/mobile && npm run lint      # eslint .

# ML
cd ml && .venv/bin/python -m pytest
```

## Cobertura por área

### API (`apps/api/tests/`)

| Arquivo | Cobre |
|---|---|
| `test_auth.py` (via `test_api.py`) | cadastro, login, refresh, logout |
| `test_contracts.py` | paridade com `contracts/*.json` |
| `test_content_ids.py` | IDs canônicos e tradução de legados |
| `test_content_lint.py` | regras pedagógicas do bundle |
| `test_content_cache.py` | `ETag`/`304` |
| `test_seed_bundle.py` | bundle semente idêntico ao seed |
| `test_progress_sync.py` | sincronização de progresso |
| `test_item_states.py` | estado por item e reapresentação |
| `test_ranking.py` | ranking por regras/modelo |
| `test_leaderboard.py` | pontos, ligas, placar |
| `test_word_bank.py` | banco de candidatos |
| `test_word_studio.py` | curadoria lexical e feedback |
| `test_admin_studio.py` | estúdio de conteúdo |
| `test_lexical_difficulty.py` | classificador lexical |

### Mobile (`apps/mobile/src/`)

Cobertura em testes de domínio (`scheduler`, `session`, `points`, `league`, `achievements`,
`levels`, `trail`, `placement`, `auth`, `content-ids`, `exercise-types`, `profile`) e de
infraestrutura (`content/schema`, `content/store`, `sync/contract`, `sync/session-retry`,
`components/exercises/OrderExercise`, `assets/managed-media`).

### ML (`ml/tests/`)

- `test_ranking_pipeline.py` — replay sem vazamento; gate promove modelo sintético e reprova
  modelos pequenos/mal calibrados/perdedores.
- `test_difficulty_classifier.py` — classificador lexical.
- `test_legacy_handwriting.py` — classificador legado (histórico).

## Resultado da última validação (11/09/2026)

Do [`docs/VALIDATION_REPORT.md`](../docs/VALIDATION_REPORT.md):

- Mobile: **42 testes** aprovados (10 arquivos); TypeScript e ESLint aprovados; `expo install --check` ok.
- API: **34 testes** aprovados.
- ML: **9 testes** aprovados.
- Alembic: upgrade/downgrade/upgrade aprovados (incluindo migrações com dados legados).

## O que falta

- Teste em Android físico com TalkBack.
- Smoke test iOS/VoiceOver.
- Avaliação com amostras reais consentidas (pré-teste/pós-teste).
- Implantação remota com restauração testada.
- Reavaliação das 13 vulnerabilidades `npm audit` na próxima atualização do SDK.
