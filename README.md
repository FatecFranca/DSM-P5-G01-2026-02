# Grupo

Este projeto é desenvolvido pelo grupo formado por:

- Ana Laura Lis
- Carlos Costa
- Gustavo Daniel
- Larissa Coutinho

## Documentação

- [Documento-base do projeto](docs/PROJECT_FOUNDATION.md)
- [Plano de implementação do MVP](docs/MVP_IMPLEMENTATION_PLAN.md)
- [Contrato pedagógico](docs/PEDAGOGICAL_CONTRACT.md)
- [Privacidade e acessibilidade](docs/PRIVACY_AND_ACCESSIBILITY.md)
- [Operação e implantação](docs/OPERATIONS.md)
- [Relatório de validação](docs/VALIDATION_REPORT.md)

## MVP Alfabetiza

O repositório contém uma implementação mobile offline-first para alfabetização inicial de jovens e adultos, uma API própria, artefatos experimentais históricos e a infraestrutura de implantação:

```text
apps/mobile/  Expo + React Native + SQLite
apps/api/     FastAPI + SQLAlchemy + Alembic + PostgreSQL
contracts/    tipos de exercício e invariantes pedagógicas compartilhados por API e mobile
ml/           artefatos experimentais históricos, fora do app atual
infra/        Docker Compose + PostgreSQL + Caddy HTTPS
docs/         contratos, decisões (docs/adr) e evidências
```

### Execução local

API:

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[dev]"
Copy-Item .env.example .env
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\python -m app.seed
.\.venv\Scripts\uvicorn app.main:app --reload
```

Mobile, em outro terminal:

```powershell
cd apps/mobile
npm install
npm run android
```

O emulador Android usa `http://10.0.2.2:8000` por padrão. Para dispositivo físico ou produção, configure `expo.extra.apiUrl` em `apps/mobile/app.json` com um endereço HTTPS acessível.

### Validação rápida

```powershell
cd apps/api
.\.venv\Scripts\python -m pytest

cd ..\mobile
npm test
npm run typecheck
npm run lint

cd ..\..\ml
python -m pytest
```

O catálogo vive na API e é servido por `GET /v1/content`; o app embarca `apps/mobile/assets/content/seed-bundle.json` para o primeiro boot offline. Depois de alterar `apps/api/app/seed.py`, regenere o bundle:

```powershell
cd apps/api
.\.venv\Scripts\python scripts\export_content_bundle.py
```

O diretório `ml/` não participa das lições atuais e não é requisito do MVP. A trilha usa conteúdo curado e regras explícitas de progressão e revisão. Consulte o relatório de validação para as evidências e limites atuais.
