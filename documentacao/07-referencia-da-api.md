# Prosa — Referência da API

> **Propósito:** documentar todos os endpoints da API do **Prosa** (`apps/api/`), com
> método, rota, autenticação, parâmetros e respostas.

Documentos relacionados: [10 — Segurança](10-seguranca.md) ·
[04 — Arquitetura](04-arquitetura-prosa.md).

Base: `http://<host>:8000`. Título OpenAPI: **Prosa API**, versão `0.1.0`.

## Autenticação

Todos os endpoints de aprendizagem, conta, ranking, placar e administração exigem um
`Authorization: Bearer <access_token>` (JWT HS256). O token de acesso tem curta duração
(padrão 15 min) e é renovado por um refresh token rotativo (padrão 30 dias).

## Endpoints por recurso

### Operações

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Health check (`{"status": "ok"}`) |
| GET | `/favicon.ico` | — | 204 (fora do schema) |

### Autenticação (`/v1/auth`)

| Método | Rota | Status | Descrição |
|---|---|---|---|
| POST | `/v1/auth/register` | 201 | Cadastro (e-mail, senha, nome opcional) |
| POST | `/v1/auth/login` | 200 | Login com e-mail/senha |
| POST | `/v1/auth/refresh` | 200 | Rotaciona refresh token |
| POST | `/v1/auth/logout` | 204 | Revoga sessão |
| POST | `/v1/auth/firebase` | 200 | Login social (ID token do Firebase) |

Exemplo de resposta (`register`/`login`/`refresh`/`firebase`):

```json
{ "access_token": "...", "refresh_token": "...", "token_type": "bearer", "expires_in": 900 }
```

### Conteúdo (`/v1`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/content` | — | Catálogo completo com `ETag`; honra `If-None-Match` (304) |

A resposta inclui `version` (16 primeiros caracteres do checksum SHA-256), `learning_order`,
`tracks` (com `units` e `items`), `words`, `sentences`, `syllables` e `assets`.

### Aprendizagem (`/v1`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/progress` | ✅ | Resumo de progresso por unidade |
| GET | `/v1/item-states` | ✅ | Estado por item (repetição espaçada) |
| GET | `/v1/attempts?limit=100` | ✅ | Últimas tentativas (limit 1–500) |
| POST | `/v1/sync/push` | ✅ | Envia lote de eventos (attempt/item_state/progress) |
| GET | `/v1/sync/pull?cursor=0&limit=200` | ✅ | Lê eventos do servidor |

Resposta de `POST /v1/sync/push`:

```json
{
  "accepted": 2, "duplicates": 0, "accepted_ids": ["e1", "e2"],
  "rejected": 1, "rejected_ids": ["e3"],
  "rejections": [{ "client_event_id": "e3", "reason": "item X não existe no catálogo" }]
}
```

### Ranking (`/v1/ranking`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/v1/ranking/next` | ✅ | Ordena candidatos elegíveis (regras e/ou modelo) |

Corpo:

```json
{ "session_id": "s1", "unit_id": "lesson-M", "candidate_item_ids": ["exercise-M-listen"], "session_size": 8 }
```

Resposta inclui `request_id`, `source`, `model_version`, `policy_version` e `items` com
`item_id`, `p_recall`, `rank`, `source`, `reason`.

### Placar (`/v1/leaderboard`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/leaderboard/me` | ✅ | Posição e pontos de quem chama |
| GET | `/v1/leaderboard?limit=4` | ✅ | Topo do placar + linha do usuário |
| GET | `/v1/leaderboard/league?limit=10` | ✅ | Liga e placar semanal |

### Conta (`/v1/me`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/me` | ✅ | Perfil (nome, e-mail) |
| GET | `/v1/me/research-consent` | ✅ | Lê consentimento de pesquisa |
| PUT | `/v1/me/research-consent` | ✅ | Define consentimento (`{"consent": bool}`) |

### Estúdio de conteúdo (`/v1/admin`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/admin/setup/status` | — | Se a conta admin já foi configurada |
| POST | `/v1/admin/setup` | — | Cria a primeira conta admin (única) |
| POST | `/v1/admin/login` | — | Login do administrador |
| GET | `/v1/admin/draft` | admin | Rascunho atual |
| GET | `/v1/admin/types` | admin | Tipos de exercício aceitos |
| GET | `/v1/admin/assets` | admin | Lista imagens importadas |
| PUT | `/v1/admin/draft` | admin | Salva rascunho (valida, mas não publica) |
| POST | `/v1/admin/validate` | admin | Valida o rascunho |
| POST | `/v1/admin/publish` | admin | Publica (atômico; muda `ETag`) |
| GET | `/v1/admin/versions` | admin | Histórico de versões |
| POST | `/v1/admin/versions/{id}/restore` | admin | Restaura uma versão |
| POST | `/v1/admin/assets/upload` | admin | Upload de imagem (JPEG/PNG/WebP/SVG, ≤ 5 MB) |
| POST | `/v1/admin/assets/import-url` | admin | Importa imagem por URL (anti-SSRF) |

### Vocabulário ML (`/v1/admin/words`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/admin/words?q=&feedback=&status=&limit=&offset=` | admin | Lista palavras com predição |
| GET | `/v1/admin/words/export-labels` | admin | Exporta rótulos confirmados/corrigidos |
| POST | `/v1/admin/words` | admin | Cria palavra candidata |
| POST | `/v1/admin/words/{id}/predict` | admin | Reexecuta a predição |
| POST | `/v1/admin/words/{id}/feedback` | admin | Feedback humano (`confirm`/`correct`) |

### Mídia (`/v1`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/media/{asset_path}` | — | Serve imagem importada (fora do schema) |

### Interface web

| Rota | Descrição |
|---|---|
| `/admin` | Estúdio de conteúdo (arquivos estáticos de `apps/admin/`) |

## Códigos de status relevantes

| Código | Significado |
|---|---|
| 200 | Sucesso (login, content, sync, etc.) |
| 201 | Recurso criado (register, setup, create_word) |
| 204 | Sem conteúdo (logout) |
| 304 | Conteúdo não modificado (`If-None-Match`) |
| 401 | Token ausente/inválido/expirado |
| 403 | Acesso administrativo exigido |
| 409 | Conflito (e-mail duplicado, admin já configurado) |
| 413 | Imagem acima do limite |
| 422 | Validação / item desconhecido / catálogo inválido |
| 503 | Firebase não configurado / manifesto indisponível |

## Contratos de sincronização

- Eventos aceitos no push: `attempt`, `item_state`, `progress`
  (discriminador `type`, ver `apps/api/app/schemas.py`).
- `client_event_id` e `client_attempt_id` são idempotentes por usuário.
- IDs legados (`exercise_id`/`lesson_id`, `recognize`, `find_in_word`) são traduzidos para os
  IDs canônicos (`apps/api/app/content_ids.py`).
- O servidor usa `extra="forbid"` nos payloads — campos extras (ex.: imagem bruta) são
  rejeitados.
