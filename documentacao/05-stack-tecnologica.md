# Prosa — Stack tecnológica

> **Propósito:** listar linguagens, frameworks, bibliotecas e versões usadas no **Prosa**,
> com justificativas.

Documentos relacionados: [04 — Arquitetura](04-arquitetura-prosa.md) ·
[12 — Deploy](12-deploy.md).

## API — `apps/api/`

Fonte: [`apps/api/pyproject.toml`](../apps/api/pyproject.toml).

| Componente | Versão | Justificativa |
|---|---|---|
| Python | `>=3.11` (Docker usa 3.12) | suporte a `StrEnum`, type hints |
| FastAPI | `>=0.115,<1` | API REST tipada, OpenAPI automático |
| Uvicorn | `>=0.30,<1` (standard) | servidor ASGI |
| SQLAlchemy | `>=2.0,<3` | ORM declarativo 2.0 |
| Alembic | `>=1.13,<2` | migrations versionadas |
| psycopg (binary) | `>=3.2,<4` | driver PostgreSQL |
| pydantic-settings | `>=2.5,<3` | configuração via `.env` |
| PyJWT | `>=2.9,<3` | JWT (HS256) |
| argon2-cffi | `>=23.1,<26` | hash de senha Argon2id |
| email-validator | `>=2.2,<3` | validação de e-mail |
| python-multipart | `>=0.0.9,<1` | upload de arquivos |
| google-auth | `>=2.30,<3` | verificação de ID token do Firebase |
| requests | `>=2.32,<3` | cliente HTTP (importação de imagem por URL) |

Extras de desenvolvimento: `pytest>=8.3`, `httpx>=0.27`. Extra opcional `corpus`
(`pandas`, `openpyxl`, `pyphen`) para gerar o banco de candidatos.

## Mobile — `apps/mobile/`

Fonte: [`apps/mobile/package.json`](../apps/mobile/package.json).

| Componente | Versão | Justificativa |
|---|---|---|
| Expo | `~57.0.22` | toolchain multiplataforma |
| React Native | `0.86.3` | runtime mobile |
| React | `19.2.3` | UI |
| TypeScript | `~6.0.3` | tipagem |
| expo-router | `~57.0.21` | navegação baseada em arquivos |
| expo-sqlite | `~57.0.3` | persistência local (conteúdo, sessão, tentativas, fila) |
| expo-secure-store | `~57.0.4` | armazenamento seguro de tokens |
| expo-speech | `~57.0.3` | texto para fala (pt-BR) |
| expo-auth-session / expo-web-browser | `~57.0.16` / `~57.0.3` | login social |
| Zustand | `^5.0.15` | estado global |
| @tanstack/react-query | `^5.102.8` | cache/consultas de servidor |
| firebase | `^13.1.0` | Firebase Auth (login Google) |
| react-native-svg | `15.15.4` | ilustrações vetoriais |
| react-native-safe-area-context / screens | `~5.7.0` / `~4.26.0` | layout/navegação |

Dev: `vitest ^5.0.0`, `eslint ^9.39.1`, `typescript-eslint ^8.53.0`, `@eslint/js ^9.39.1`.

## Machine Learning — `ml/`

Fonte: [`ml/pyproject.toml`](../ml/pyproject.toml).

| Componente | Versão | Justificativa |
|---|---|---|
| Python | `>=3.11` | idem |
| numpy | `>=1.26,<3` | vetores |
| pandas | `>=2.1,<3` | manipulação de dados |
| scikit-learn | `>=1.4,<2` | regressão logística, avaliação |
| joblib | `>=1.3,<2` | persistência de artefatos (legado) |
| Pillow | `>=10,<13` | processamento de imagem (legado) |

Opcionais: `skl2onnx`, `onnxruntime` (artefato legado de escrita manuscrita).

## Infraestrutura — `infra/`

Fonte: [`infra/compose.yaml`](../infra/compose.yaml).

| Componente | Versão | Papel |
|---|---|---|
| PostgreSQL | `16.4-alpine` | banco de produção |
| Caddy | `2.8-alpine` | proxy reverso + HTTPS automático |
| API (imagem) | `python:3.12-slim` | serviço `api` |

## Observações

- A API em produção **não carrega** ferramentas de análise/ML (`ml/`); a imagem
  (`infra/api.Dockerfile`) instala apenas `apps/api`.
- O banco de desenvolvimento padrão é **SQLite** (`alfabetiza.db`); PostgreSQL é usado em
  produção via Docker Compose.
- Não há frontend web separado: o Estúdio de conteúdo é servido pelo próprio FastAPI em
  `/admin` (arquivos estáticos em `apps/admin/`).
