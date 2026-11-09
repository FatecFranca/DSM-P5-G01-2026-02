# Prosa — Guia de instalação

> **Propósito:** permitir que um novo desenvolvedor rode o **Prosa** localmente usando
> apenas este documento.

Documentos relacionados: [05 — Stack tecnológica](05-stack-tecnologica.md) ·
[12 — Deploy](12-deploy.md) · [09 — Estrutura](09-estrutura-do-projeto.md).

## Pré-requisitos

- Python `>= 3.11` (recomendado 3.12)
- Node.js + npm (para o mobile; Expo SDK 57)
- (opcional) Docker Engine + Docker Compose, para rodar com PostgreSQL
- Emulador Android ou dispositivo físico, para o app

## 1. API (`apps/api/`)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\activate
python -m pip install -e ".[dev]"
cp .env.example .env               # Windows: Copy-Item .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

- O `.env.example` usa SQLite local (`./alfabetiza.db`) — adequado para desenvolvimento.
- Abra `http://127.0.0.1:8000/admin/` para configurar a **única** conta do Estúdio de
  conteúdo (tela de setup local). Após configurar, o seed não sobrescreve a curadoria.
- A documentação interativa da API fica em `http://127.0.0.1:8000/docs`.

### Variáveis de ambiente (`.env`)

| Chave | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | `sqlite+pysqlite:///./alfabetiza.db` | URL do banco |
| `JWT_SECRET` | `development-only-secret-change-me` | segredo JWT (≥ 32 chars) |
| `ACCESS_TOKEN_MINUTES` | `15` | validade do access token |
| `REFRESH_TOKEN_DAYS` | `30` | validade do refresh token |
| `ENVIRONMENT` | `development` | `development` ou `production` |
| `FIREBASE_PROJECT_ID` | *(vazio)* | projeto Firebase (login Google) |
| `RANKING_MODEL_ENABLED` | `false` | liga/desliga o ranking por modelo |
| `RANKING_MODEL_PATH` | *(vazio)* | caminho do manifesto JSON |
| `RANKING_SHADOW_MODE` | `true` | calcula/registra, mas serve regras |
| `RANKING_EPSILON` | `0.05` | taxa de exploração |

## 2. Mobile (`apps/mobile/`)

Em outro terminal:

```bash
cd apps/mobile
npm install
npm run android          # ou: npm run ios
```

- O emulador Android usa `http://10.0.2.2:8000` por padrão (ver `expo.extra.apiUrl` em
  `app.json`).
- Para dispositivo físico ou produção, configure `expo.extra.apiUrl` para um endereço HTTPS
  acessível.
- O login com Google (Firebase Auth) requer *development build*
  (`expo run:android` / `expo run:ios`), não funciona no Expo Go.

## 3. Machine Learning (`ml/`)

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[test]" -e "../apps/api[dev]"
python -m pytest
```

Para treinar/avaliar (ver [`ml/README.md`](../ml/README.md)):

```bash
python -m alfabetiza_ml.train_difficulty --out artifacts/difficulty_manifest.json
python -m alfabetiza_ml.train_ranking --database-url "postgresql+psycopg://..." --out artifacts/ranking_manifest.json
```

## 4. Infraestrutura (`infra/`) — opcional, produção-like

```bash
cd infra
cp .env.example .env    # preencha todos os segredos
docker compose config --quiet
docker compose up -d --build
# migrations + seed conforme o README da API
```

Ver [12 — Deploy](12-deploy.md) para o fluxo completo.

## Validação rápida

```bash
cd apps/api && .venv/bin/python -m pytest
cd apps/mobile && npm test && npm run typecheck && npm run lint
cd ml && .venv/bin/python -m pytest
```

## Regenerar o bundle semente

Depois de alterar o catálogo-base (`content_data.py`) ou o seed:

```bash
cd apps/api
.venv/bin/python scripts/export_content_bundle.py
```

Isso gera `apps/mobile/assets/content/seed-bundle.json`, verificado por
`tests/test_seed_bundle.py`.

## Solução de problemas

- **A API não sobe com segredo padrão em produção** — `config.py` exige `JWT_SECRET` sem
  `change-me` quando `ENVIRONMENT=production`.
- **Firebase não configurado** — `POST /v1/auth/firebase` responde 503 sem
  `FIREBASE_PROJECT_ID`.
- **Ranking sem modelo** — responde `source=rules-fallback` com `reason=model_disabled`
  quando `RANKING_MODEL_ENABLED=false` (comportamento esperado).
