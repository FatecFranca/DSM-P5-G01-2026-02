# Prosa — Banco de dados

> **Propósito:** descrever o modelo de dados do **Prosa** (entidades, relacionamentos,
> restrições e migrations), com diagrama ER.

Documentos relacionados: [04 — Arquitetura](04-arquitetura-prosa.md) ·
[09 — Estrutura](09-estrutura-do-projeto.md).

Fonte da verdade: [`apps/api/app/models.py`](../apps/api/app/models.py).

## Visão geral

Dois eixos de dados (ADR 0002):

1. **Conteúdo** — catálogo pedagógico server-driven, versionado e revisado.
2. **Aprendizagem** — tentativas, estado por item, progresso, ranking e sincronização.

## Diagrama ER

```mermaid
erDiagram
    users ||--o{ auth_sessions : possui
    users ||--o{ attempts : faz
    users ||--o{ item_states : tem
    users ||--o{ progress : tem
    users ||--o{ ranking_logs : gera
    users ||--o{ sync_events : envia
    users ||--o{ content_versions : publica

    tracks ||--o{ units : contem
    units ||--o{ items : contem
    tracks ||--o{ sentences : agrupa
    words ||--o{ word_tracks : liga
    tracks ||--o{ word_tracks : liga

    items }o--|| units : pertence
    attempts }o--|| items : referencia
    attempts }o--|| units : referencia
    item_states }o--|| items : referencia
    progress }o--|| units : referencia

    content_reviews }o--|| users : revisado_por

    users {
        string id PK
        string email UK
        string name
        string password_hash
        string firebase_uid UK
        datetime created_at
        bool research_consent
        datetime research_consent_at
        bool is_admin
    }
    auth_sessions {
        string id PK
        string user_id FK
        string refresh_jti_hash
        datetime expires_at
        datetime revoked_at
    }
    tracks {
        string id PK
        string slug UK
        string title
        string kind
        string description
        int position
        string review_status
        int version
    }
    units {
        string id PK
        string track_id FK
        string kind
        string title
        int position
        int phase
        string phase_title
        string focus_letter
        string required_letters
        string review_status
        int version
    }
    items {
        string id PK
        string unit_id FK
        string type
        string item_kind
        string target_id
        string instruction
        string answer
        json options
        string context_word
        json word_choices
        json payload
        string required_letters
        string audio_asset
        string tts_fallback_text
        int position
        string review_status
    }
    words {
        string id PK
        string text UK
        json syllables
        string required_letters
        bool accented
        int length
        float frequency
        int raw_frequency
        string frequency_source
        string initial_difficulty
        string current_difficulty
        string difficulty_rationale
        string model_difficulty
        string label_feedback
        datetime labeled_at
        string labeled_by
        string image_asset
        string image_alt
        string audio_asset
        string region_notes
        string license
        string attribution
        string source
        string review_status
        int content_version
    }
    syllables {
        string id PK
        string text
        string pattern
        string required_letters
        int position
        string difficulty
        string audio_asset
        string review_status
    }
    sentences {
        string id PK
        string text
        string track_id FK
        json required_word_ids
        string required_letters
        int word_count
        string difficulty
        string audio_asset
        string image_asset
        string image_alt
        string license
        string attribution
        string review_status
        int content_version
    }
    word_tracks {
        string word_id PK_FK
        string track_id PK_FK
        int position
    }
    content_reviews {
        string id PK
        string entity_type
        string entity_id
        int entity_version
        string reviewer
        string decision
        string source
        text notes
        datetime reviewed_at
    }
    assets {
        string id PK
        string kind
        string audio_kind
        string license
        string attribution
        string checksum
        int duration_ms
        string alt
    }
    content_versions {
        int id PK
        string version
        string checksum
        string notes
        datetime published_at
        json snapshot
        string author_id FK
    }
    content_studio_state {
        int id PK
        json draft
        json published
        datetime updated_at
    }
    attempts {
        string id PK
        string user_id FK
        string client_attempt_id
        string item_id FK
        string unit_id FK
        string exercise_type
        text answer
        bool correct
        int duration_ms
        string session_id
        int position_in_session
        int attempt_index_in_item
        int audio_repeats
        int time_to_first_interaction_ms
        string served_by
        string served_policy_version
        string served_model_version
        datetime occurred_at
    }
    item_states {
        string id PK
        string user_id FK
        string item_id FK
        string unit_id FK
        int strength
        float half_life_hours
        datetime due_at
        int reps
        int lapses
        int consecutive_correct
        bool last_result
        datetime last_seen_at
        datetime updated_at
    }
    progress {
        string id PK
        string user_id FK
        string unit_id FK
        string status
        int completed_exercises
        json completed_types
        int attempts
        int correct_attempts
        float accuracy
        int review_count
        datetime last_practiced_at
        datetime next_review_at
        datetime updated_at
    }
    ranking_logs {
        string id PK
        string user_id FK
        string session_id
        string unit_id
        json candidate_item_ids
        json scores
        string source
        string model_version
        string policy_version
        datetime served_at
    }
    sync_events {
        int id PK
        string user_id FK
        string client_event_id
        string type
        json payload
        datetime occurred_at
        datetime created_at
    }
```

## Restrições importantes

| Restrição | Local | Motivo |
|---|---|---|
| `users.email` único | `models.py` | identidade de login |
| `users.firebase_uid` único | `models.py` | vínculo do login social |
| `attempts (user_id, client_attempt_id)` único | `models.py` | idempotência de tentativas |
| `item_states (user_id, item_id)` único | `models.py` | um estado por item por usuário |
| `progress (user_id, unit_id)` único | `models.py` | um resumo por unidade |
| `sync_events (user_id, client_event_id)` único | `models.py` | idempotência da fila |
| `words.text` único | `models.py` | texto canônico da palavra |
| FKs `ondelete=CASCADE` em `auth_sessions` | `models.py` | limpeza de sessões |

## Migrations

As migrations estão em `apps/api/migrations/versions/` e cobrem a evolução do schema:

| Migration | Conteúdo |
|---|---|
| `6fb301185a23_initial_schema.py` | schema inicial |
| `20260910_progressive_learning.py` | aprendizagem progressiva |
| `20260910_progress_metadata.py` | metadados de progresso |
| `20260910_remove_writing_exercises.py` | remoção de exercícios de escrita |
| `20260910_word_requirements.py` | requisitos de letras em palavras |
| `20260915_attempt_context.py` | contexto de sessão em tentativas |
| `20260915_canonical_content_ids.py` | IDs canônicos + mesclagem de duplicatas |
| `20260915_exercise_word_choices.py` | escolhas de palavra |
| `20260916_content_model.py` | modelo de conteúdo (trilhas, sílabas, frases) |
| `20260916_content_studio.py` | estado do Estúdio |
| `20260917_item_states.py` | estado por item |
| `20260918_ranking_logs.py` | registro do ranking |
| `20261018_word_ml_labels.py` | rótulos de ML lexical |
| `20261021_user_name.py` | nome do usuário |
| `20261022_google_login.py` | login Google (Firebase) |

## Notas

- O desenvolvimento usa SQLite (`sqlite+pysqlite:///./alfabetiza.db`); produção usa
  PostgreSQL (`postgresql+psycopg://...`), conforme `infra/compose.yaml`.
- O `downgrade` da migration `20260916_content_model.py` é **lossy** para metadados novos e
  unidades temáticas (ADR 0002).
- Palavras candidatas do corpus entram em `words` com `review_status = candidate` e
  `frequency_source = corpus-santos-toni`; nunca saem no bundle.
