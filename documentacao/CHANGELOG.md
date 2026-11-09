# Changelog — Prosa

> **Propósito:** registrar as mudanças relevantes do **Prosa**. Esta entrada inicial
> descreve o estado do repositório em 2026-11-04, com base no histórico de commits e nos
> artefatos presentes.

## [0.1.0] — estado atual (não publicado formalmente)

### Aplicações

- **Mobile** (`apps/mobile/`): Expo SDK 57 + React Native 0.86, offline-first com SQLite,
  sessão por unidade, repetição espaçada por item, TTS pt-BR, login Google (Firebase),
  placar/ligas e conquistas.
- **API** (`apps/api/`): FastAPI 0.115, catálogo server-driven com `ETag`, autenticação JWT +
  Argon2id, sincronização idempotente, ranking no servidor, placar, Estúdio de conteúdo e
  vocabulário ML.
- **ML** (`ml/`): treino/avaliação do ranking (ADR 0004) e do classificador lexical
  (ADR 0005); legado de escrita manuscrita em `ml/legacy`.
- **Infra** (`infra/`): Docker Compose com PostgreSQL 16 e Caddy 2.8, scripts de backup.

### Decisões registradas (docs/adr)

- `0001` Conteúdo server-driven.
- `0002` Modelo de conteúdo (trilhas, sílabas, frases).
- `0003` Repetição espaçada por item.
- `0004` Reabertura de ML como ranking no servidor.
- `0005` Classificador supervisionado de dificuldade lexical.

### Marcos recentes do histórico (ordem inversa)

- Merge de `pre-processamento` (tratamento de palavras com `á`/`ô`, deduplicação).
- Login Google via Firebase Auth (migration `20261022_google_login`).
- Rótulos de ML lexical (`20261018_word_ml_labels`).
- `user_name` no perfil (`20261021_user_name`).
- Ranking logs (`20260918_ranking_logs`), item states (`20260917_item_states`).

> **Nota:** este changelog é um ponto de partida. Recomenda-se adotar
> [Keep a Changelog](https://keepachangelog.com/pt-BR/) e versionamento semântico a partir
> da próxima release.
