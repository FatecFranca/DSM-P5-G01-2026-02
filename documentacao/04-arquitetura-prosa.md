# Prosa — Arquitetura

> **Propósito:** descrever o estilo arquitetural, as camadas, os componentes e as decisões
> técnicas do **Prosa**.

Documentos relacionados: [05 — Stack tecnológica](05-stack-tecnologica.md) ·
[06 — Banco de dados](06-banco-de-dados.md) · [09 — Estrutura](09-estrutura-do-projeto.md) ·
[adr/](adr/).

## Estilo arquitetural

O sistema é composto por **três aplicações** que conversam por HTTP/JSON:

- **`apps/mobile/`** — cliente *offline-first* (Expo/React Native), que mantém uma cópia
  local do catálogo e da fila de sincronização.
- **`apps/api/`** — API REST (FastAPI), fonte única do catálogo e do estado compartilhado.
- **`ml/`** — pipeline de treino/avaliação (Python), que gera manifestos JSON consumidos
  pela API em Python puro (sem NumPy/scikit-learn em runtime).

O conteúdo é **server-driven**: o servidor é a única fonte do catálogo; o aplicativo embarca
um *bundle semente* para o primeiro boot offline e, depois, baixa e valida o catálogo
(`GET /v1/content` com `ETag`/`304`).

```mermaid
flowchart LR
    subgraph App["Aplicativo mobile (Expo/RN)"]
        UI[Telas/Exercícios]
        SQLite[(SQLite)]
        Queue[Fila de sincronização]
        Session[Session engine]
    end
    subgraph API["API (FastAPI)"]
        Auth[Autenticação]
        Content[Catálogo/Conteúdo]
        Sync[Sincronização]
        Ranking[Ranking]
        Leaderboard[Placar]
        Admin[Estúdio]
        Words[Vocabulário ML]
    end
    subgraph ML["Pipeline ML"]
        TrainRank[Treino ranking]
        TrainDiff[Classificador lexical]
    end
    subgraph Infra["Infraestrutura"]
        PG[(PostgreSQL)]
        Caddy[Caddy HTTPS]
    end

    UI --> SQLite
    UI --> Session
    Session --> Queue
    Queue -->|POST /v1/sync/push| Sync
    UI -->|GET /v1/content| Content
    UI -->|auth| Auth
    Content --> PG
    Sync --> PG
    Ranking --> PG
    Leaderboard --> PG
    Admin --> PG
    Words --> PG
    TrainRank -->|manifesto JSON| Ranking
    TrainDiff -->|manifesto JSON| Words
    Caddy --> API
```

## Camadas da API

A API (`apps/api/app/`) é organizada em módulos com responsabilidade única:

| Camada/Arquivo | Responsabilidade |
|---|---|
| `main.py` | Composição do app FastAPI, `lifespan`, montagem de `/admin` |
| `config.py` | Configuração via `pydantic-settings` (`.env`) |
| `db.py` | Engine/session SQLAlchemy |
| `models.py` | Entidades ORM (SQLAlchemy 2 declarativo) |
| `schemas.py` | Modelos Pydantic de entrada/saída (contratos de sync) |
| `security.py` | JWT (HS256) e Argon2id |
| `deps.py` | `current_user` (autenticação bearer) |
| `auth.py` | `register/login/refresh/logout/firebase` |
| `content.py` | `GET /v1/content` (ETag, bundle) |
| `content_data.py` | Catálogo curado à mão (fonte da verdade) |
| `content_types.py` | Enumeração de tipos de exercício (espelha contrato) |
| `content_ids.py` | IDs canônicos e tradução de IDs legados |
| `content_lint.py` | Validação pedagógica do bundle |
| `seed.py` | Seed idempotente do banco a partir de `content_data.py` |
| `sync.py` | `push`/`pull` idempotentes |
| `me.py` | Perfil e consentimento de pesquisa |
| `leaderboard.py` | Placar e ligas |
| `word_studio.py` | Curadoria lexical e feedback humano |
| `lexical_difficulty.py` | Inferência local do classificador lexical |
| `admin.py` | Estúdio local de conteúdo e mídia |
| `firebase.py` | Verificação de ID tokens do Firebase Auth |
| `word_bank.py` | Carga do banco de candidatos (corpus) |
| `ranking/` | Serviço de ranking (`service`, `rules`, `model`, `features`, `scheduler`) |

## Camadas do mobile

| Camada | Responsabilidade |
|---|---|
| `app/` (telas) | `index`, `auth`, `placement`, `lessons`, `progress`, `profile`, `ranking`, `achievements`, `lesson/[id]`, `trail/[stage]` |
| `src/api/` | cliente HTTP (`client.ts`, `errors.ts`) |
| `src/content/` | cache do catálogo (`store.ts`), validação (`schema.ts`) |
| `src/storage/` | SQLite (`database.ts`), sessão (`session.ts`) |
| `src/sync/` | contrato de sync, fila, retry (`use-sync.ts`, `session-retry.ts`) |
| `src/domain/` | lógica pura (scheduler, session, learning, levels, points, league, achievements, trail, placement) |
| `src/components/` | UI (`exercises/`, `ui/`, `AudioButton`, etc.) |
| `src/store/` | estado (Zustand) de autenticação e estudo |

## Decisões técnicas centrais (resumo)

| Decisão | ADR | Resumo |
|---|---|---|
| Conteúdo server-driven | [ADR 0001](adr/0001-conteudo-server-driven.md) | Servidor é a única fonte do catálogo; `ETag`/`304`; bundle semente |
| Modelo de conteúdo (trilhas, sílabas, frases) | [ADR 0002](adr/0002-modelo-de-conteudo.md) | Dois eixos: portão por `required_letters`; trilha só agrupa |
| Repetição espaçada por item | [ADR 0003](adr/0003-repeticao-por-item.md) | Estado por item; sessão reapresenta erros; progresso derivado |
| ML como ranking no servidor | [ADR 0004](adr/0004-reabertura-de-ml-como-ranking.md) | Modelo só reordena elegíveis; gate de promoção; shadow mode |
| Classificador de dificuldade lexical | [ADR 0005](adr/0005-classificador-dificuldade-lexical.md) | Regressão logística multinomial sobre features silábicas |

## Fluxos principais

### Fluxo de uma sessão de estudo (offline)

```mermaid
sequenceDiagram
    participant U as Aprendiz
    participant A as App (mobile)
    participant L as SQLite
    participant S as API

    U->>A: abre uma lição
    A->>L: carrega catálogo em cache
    A->>A: monta sessão (vencidos/fracos/novos)
    loop cada item
        A->>A: renderiza exercício + TTS
        U->>A: responde
        A->>L: grava tentativa + item_state
    end
    A->>L: grava fila de sync
    A-->>S: (quando online) POST /v1/sync/push
    S->>S: idempotência + rejeições
    S-->>A: POST result (accepted/duplicates/rejections)
    A->>S: GET /v1/sync/pull
```

### Fluxo de ranking

```mermaid
sequenceDiagram
    participant A as App
    participant R as /v1/ranking/next
    participant S as ranking_logs

    A->>R: POST candidatos elegíveis
    R->>R: regras (piso) por item
    alt modelo promovido e habilitado
        R->>R: p_model (shadow ou serve)
    end
    R->>S: registra request_id, p_rules, p_model, reason
    R-->>A: itens ordenados (source/reason)
```

## Limites e acoplamentos

- A API **não importa NumPy/scikit-learn** em runtime; o ranking e o classificador lexical
  são aplicados a partir de manifestos JSON (coeficientes) em Python puro.
- `apps/api/app/ranking/` e `apps/mobile/src/domain/scheduler.ts` são **portas espelhadas**
  da mesma lógica (repetição espaçada), garantindo que o que se avalia (`ml/replay.py`) é o
  que se serve.
- Os contratos em `contracts/*.json` são a fonte única de tipos/invariantes; API e mobile
  os espelham e os testes falham em caso de divergência.
