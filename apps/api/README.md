# Prosa API

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

O `.env.example` usa SQLite local (`./alfabetiza.db`) para desenvolvimento. Em produção, aponte `DATABASE_URL` para PostgreSQL e configure um `JWT_SECRET` aleatório antes de `alembic upgrade head` e do seed.

Execute os testes com `.\.venv\Scripts\python -m pytest`.

## Estúdio local de conteúdo

Em desenvolvimento, abra `http://127.0.0.1:8000/admin/`. A primeira pessoa
cria a única conta administrativa local; o painel salva rascunhos, valida o
mesmo contrato do aplicativo, publica snapshots restauráveis e importa imagens
por arquivo, área de transferência ou URL para o armazenamento local. URLs são
copiadas, não usadas diretamente pelo aplicativo. Mídia enviada fica em
`app/data/media/`, que é propositalmente ignorado pelo Git.

`POST /v1/sync/push` aceita lotes de eventos `attempt` e `progress`. `client_event_id` e `client_attempt_id` são idempotentes por usuário. A resposta mantém as contagens `accepted` e `duplicates` e inclui `accepted_ids` com os `client_event_id` confirmados, tanto novos quanto duplicados, para que o aplicativo possa removê-los com segurança da fila local. O servidor não aceita campos extras, evitando o envio acidental de imagens brutas.
