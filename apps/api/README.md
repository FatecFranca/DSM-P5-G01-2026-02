# Alfabetiza API

API FastAPI do MVP, com PostgreSQL, migrations Alembic, autenticação JWT e sincronização offline idempotente.

## Desenvolvimento

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[dev]"
Copy-Item .env.example .env
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\python -m app.seed
.\.venv\Scripts\uvicorn app.main:app --reload
```

Execute os testes com `.\.venv\Scripts\python -m pytest`. Em produção, configure um `JWT_SECRET` aleatório e execute `alembic upgrade head` seguido do seed antes de iniciar o servidor.

`POST /v1/sync/push` aceita lotes de eventos `attempt` e `progress`. `client_event_id` e `client_attempt_id` são idempotentes por usuário. A resposta mantém as contagens `accepted` e `duplicates` e inclui `accepted_ids` com os `client_event_id` confirmados, tanto novos quanto duplicados, para que o aplicativo possa removê-los com segurança da fila local. O servidor não aceita campos extras, evitando o envio acidental de imagens brutas.
