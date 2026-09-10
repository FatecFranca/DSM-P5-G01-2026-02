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

O repositório contém uma implementação mobile offline-first para alfabetização inicial de jovens e adultos, uma API própria, o pipeline reproduzível de classificação e a infraestrutura de implantação:

```text
apps/mobile/  Expo + React Native + SQLite + ONNX Runtime
apps/api/     FastAPI + SQLAlchemy + Alembic + PostgreSQL
ml/           treinamento, avaliação e exportação ONNX
infra/        Docker Compose + PostgreSQL + Caddy HTTPS
docs/         contratos, decisões e evidências
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

O modelo incluído demonstra o fluxo técnico completo e não está liberado para avaliação pedagógica: foi treinado com dados sintéticos. Consulte o relatório de validação para as evidências e limites atuais.
