# Prosa — Estrutura do projeto

> **Propósito:** apresentar a árvore de pastas e a responsabilidade de cada módulo/pacote
> do **Prosa**.

Documentos relacionados: [04 — Arquitetura](04-arquitetura-prosa.md) ·
[05 — Stack tecnológica](05-stack-tecnologica.md).

```text
DSM-P5-G01-2026-02/
├── README.md                  # apresentação do grupo e instruções rápidas
├── .gitignore
├── apps/
│   ├── mobile/                # aplicativo Expo/React Native (offline-first)
│   │   ├── app/               # telas (expo-router): index, auth, placement,
│   │   │   │                  #   lessons, progress, profile, ranking,
│   │   │   │                  #   achievements, lesson/[id], trail/[stage]
│   │   ├── src/
│   │   │   ├── api/           # cliente HTTP + tratamento de erros
│   │   │   ├── assets/        # manifesto de ilustrações e mídia gerenciada
│   │   │   ├── components/    # UI: exercises/, ui/, AudioButton, etc.
│   │   │   ├── content/       # cache do catálogo (store) e validação (schema)
│   │   │   ├── domain/        # lógica pura: scheduler, session, learning,
│   │   │   │                  #   levels, points, league, achievements, trail,
│   │   │   │                  #   placement, exercise-types, content-ids
│   │   │   ├── profile/       # conquistas e estatísticas do aprendiz
│   │   │   ├── storage/       # SQLite (database, session)
│   │   │   ├── store/         # Zustand (auth-store, study-store)
│   │   │   └── sync/          # contrato, fila, retry (use-sync, session-retry)
│   │   ├── assets/            # imagens (marca, conquistas, trilha, conteúdo,
│   │   │   │                  #   seed-bundle.json)
│   │   ├── ios/  android/     # projetos nativos
│   │   ├── app.json           # config Expo (apiUrl, Firebase, Google client IDs)
│   │   ├── package.json       # dependências e scripts
│   │   └── vitest.config.ts   # config de teste
│   └── api/                   # API FastAPI
│       ├── app/
│       │   ├── main.py        # composição do app
│       │   ├── config.py      # settings (pydantic-settings)
│       │   ├── db.py          # engine/session
│       │   ├── models.py      # entidades ORM
│       │   ├── schemas.py     # contratos Pydantic
│       │   ├── security.py    # JWT + Argon2id
│       │   ├── deps.py        # current_user
│       │   ├── auth.py        # autenticação
│       │   ├── content.py     # GET /v1/content
│       │   ├── content_data.py# catálogo curado (fonte da verdade)
│       │   ├── content_types.py# enum de tipos
│       │   ├── content_ids.py # IDs canônicos
│       │   ├── content_lint.py# validação pedagógica
│       │   ├── seed.py        # seed idempotente
│       │   ├── sync.py        # push/pull
│       │   ├── me.py          # perfil + consentimento
│       │   ├── leaderboard.py # placar e ligas
│       │   ├── word_studio.py # vocabulário ML
│       │   ├── lexical_difficulty.py# inferência local
│       │   ├── admin.py       # estúdio de conteúdo
│       │   ├── firebase.py    # verificação de token Firebase
│       │   ├── word_bank.py   # carga do corpus
│       │   ├── ranking/       # service, rules, model, features, scheduler
│       │   └── data/          # word_bank.json, media/
│       ├── migrations/        # Alembic (versions/)
│       ├── scripts/           # export_content_bundle.py, build_word_bank.py
│       ├── tests/             # pytest
│       ├── pyproject.toml
│       └── alembic.ini
├── contracts/                 # fonte única de tipos/invariantes (JSON)
│   ├── exercise-types.json
│   └── pedagogy.json
├── ml/                        # pipeline de ML (treino/avaliação)
│   ├── src/alfabetiza_ml/     # train_ranking, train_difficulty, replay,
│   │   │                      #   tabular, relabel_word_bank, legacy/
│   ├── artifacts/             # difficulty_manifest.json, legacy/
│   ├── data/                  # difficulty_labels.json
│   └── tests/                 # pytest
├── infra/                     # Docker Compose + Caddy + scripts de backup
│   ├── compose.yaml
│   ├── api.Dockerfile
│   ├── Caddyfile
│   ├── .env.example
│   └── scripts/               # backup.sh, restore.sh
├── docs/                      # contratos, ADRs e evidências (originais)
└── pre-processamento/         # notebooks e relatórios de pré-processamento do corpus
```

## Responsabilidades por aplicação

| Diretório | Responsabilidade |
|---|---|
| `apps/mobile/` | experiência do aprendiz: telas, sessão de estudo, TTS, SQLite, fila de sync |
| `apps/api/` | fonte do catálogo, autenticação, sincronização, ranking, placar, estúdio |
| `contracts/` | contratos compartilhados (tipos de exercício e invariantes) |
| `ml/` | treino/avaliação dos manifestos consumidos pela API |
| `infra/` | empacotamento e operação em produção |
| `docs/` | documentos-base, decisões e evidências |
| `pre-processamento/` | notebooks históricos de pré-processamento do corpus (Corpus SANTOS TONI) |

## Convenções de nomenclatura observadas

- Unidades de letra: `lesson-<LETRA>` (ex.: `lesson-A`).
- Itens de letra: `exercise-<LETRA>-<sufixo>` (ex.: `exercise-M-listen`).
- Itens de trilha temática: `item-<unidade>-<n>` (ex.: `item-casa-1-1`).
- Palavras: UUIDv5 determinístico (`uuid5(NAMESPACE_URL, "alfabetiza:word:<TEXTO>")`).
- Sílabas: o próprio texto como chave primária (ex.: `MA`).
