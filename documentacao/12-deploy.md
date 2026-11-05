# Prosa — Deploy

> **Propósito:** documentar build, Docker, ambientes e o fluxo de implantação do **Prosa**.

Documentos relacionados: [10 — Segurança](10-seguranca.md) ·
[08 — Guia de instalação](08-guia-de-instalacao.md) · [`infra/README.md`](../infra/README.md).

## Ambientes

| Ambiente | Descrição |
|---|---|
| Desenvolvimento | mobile Expo local + API local (SQLite) + PostgreSQL opcional via Compose |
| Produção | VPS Ubuntu na Azure: Caddy (HTTPS) + API + PostgreSQL em rede privada do Compose |

## Build da API

Imagem definida em [`infra/api.Dockerfile`](../infra/api.Dockerfile): multi-stage
(`python:3.12-slim`), instala apenas `apps/api` (sem ferramentas de ML), roda como usuário
não-root `app`, expõe `8000`, `CMD uvicorn app.main:app --proxy-headers`.

A imagem **não** inclui `ml/` — a API aplica manifestos JSON (coeficientes) em Python puro.

## Implantação (VPS Ubuntu)

1. Configurar DNS para o endereço da VPS.
2. Instalar Docker Engine e o plugin Compose.
3. Liberar apenas SSH administrado, HTTP (80/443) e UDP 443 no firewall.
4. Copiar o código e preencher `infra/.env` **sem** versioná-lo (`chmod 600 .env`).
5. `docker compose config --quiet` e `docker compose up -d --build`.
6. Executar migrations (`alembic upgrade head`) e seed da API.
7. Confirmar o health check por HTTPS (`curl -fsS https://SEU_DOMINIO/health`) antes de
   apontar o app para a API.

O Caddy obtém e renova certificados automaticamente.

## Variáveis de produção (`infra/.env`)

| Chave | Descrição |
|---|---|
| `DOMAIN` | domínio público (ex.: `alfabetiza.example.com`) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | banco |
| `JWT_SECRET` | segredo JWT (gerado com fonte segura) |
| `CORS_ORIGINS` | origem do app |
| `BACKUP_RETENTION_DAYS` | retenção de backups (padrão 14) |

Variáveis do ranking (ADR 0004): `RANKING_MODEL_ENABLED`, `RANKING_MODEL_PATH`,
`RANKING_SHADOW_MODE`, `RANKING_EPSILON`.

## Backup e restauração

```sh
cd infra
./scripts/backup.sh
./scripts/restore.sh backups/alfabetiza-DATA.dump --confirm-replace-database
```

- `backup.sh` gera dump custom (`pg_dump --format=custom`) e aplica retenção.
- `restore.sh` usa `pg_restore --clean --if-exists` e exige a flag
  `--confirm-replace-database`.
- Copie os dumps para armazenamento externo **criptografado**; o volume local não é backup.
- Teste periodicamente a restauração em banco descartável.

## Rollback do modelo de ranking

Apontar `RANKING_MODEL_PATH` para o manifesto anterior e reiniciar a API. O servidor recusa
manifestos sem `promotion_allowed` ou com features diferentes das suas.

## Evidências operacionais obrigatórias

- Resposta HTTPS de `/health`.
- Containers saudáveis após reinício da VPS.
- Migration e seed concluídos.
- Restauração de backup validada em banco separado.
- Ausência de segredos no Git e de dados pessoais nos logs.

> Essas evidências só podem ser marcadas como obtidas após a implantação no ambiente Azure
> autorizado (ver [`docs/OPERATIONS.md`](../docs/OPERATIONS.md)).

## CI/CD

Não há pipeline de CI/CD configurado no repositório (`TODO`: confirmar ausência de
`.github/workflows`, GitLab CI ou similar). A validação atual é manual, conforme descrito em
[11 — Testes](11-testes.md).
