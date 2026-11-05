# Módulo: Estúdio de conteúdo

> **Propósito:** descrever o Estúdio local de conteúdo do **Prosa** — edição em snapshot,
> validação e publicação do catálogo server-driven.

Arquivos: [`apps/api/app/admin.py`](../../apps/api/app/admin.py) ·
[`apps/api/app/content_lint.py`](../../apps/api/app/content_lint.py) ·
[`apps/api/app/content.py`](../../apps/api/app/content.py).

Documentos relacionados: [Módulo: Catálogo e conteúdo](./modulo-conteudo.md) ·
[ADR 0001](../adr/0001-conteudo-server-driven.md) · [06 — Banco de dados](../06-banco-de-dados.md).

## Modelo de edição

O editor trabalha em um **snapshot** (`ContentStudioState.draft`) no SQLite; somente uma
publicação validada troca o snapshot que `GET /v1/content` expõe. Assim tentativas apontando
para IDs antigos continuam válidas e um novo seed não atropela a curadoria local.

- É permitido **salvar rascunho incompleto** (`PUT /v1/admin/draft`); o painel mostra os erros.
- **Publicar** (`POST /v1/admin/publish`) é o bloqueio real: recusa com `422` se `lint_content`
  apontar erro ou se unidade/item já publicado for apagado (deve virar `retired`).
- Publicar materializa o snapshot nas tabelas operacionais (`Item`/`Unit`/`Track`/`Word`/
  `Sentence`/`Syllable`) e cria um `ContentVersion` versionado por checksum.

## Endpoints (prefixo `/v1/admin`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/setup/status` | se já há administrador configurado |
| POST | `/setup` | cria o administrador local (uma vez) |
| POST | `/login` | login do administrador |
| GET | `/draft` | lê o rascunho |
| PUT | `/draft` | salva rascunho (devolve `errors`) |
| POST | `/validate` | valida sem publicar |
| POST | `/publish` | publica snapshot validado |
| GET | `/versions` | histórico de versões |
| POST | `/versions/{id}/restore` | restaura uma versão |
| GET | `/types` | tipos de exercício aceitos |
| GET | `/assets` | lista imagens |
| POST | `/assets/upload` | envia imagem (≤ 5 MB) |
| POST | `/assets/import-url` | importa imagem por URL |

## Mídia

- `GET /v1/media/{asset_path}` serve imagens; só JPEG/PNG/WebP/SVG (validação por magic
  bytes), limite de 5 MB.
- `alt` (descrição acessível) é obrigatório no upload.

## Proteção anti-SSRF

`_safe_url` só aceita `http(s)` com host resolvível e **IP global** (bloqueia rede privada/local);
redirecionamentos são recusados (`_RejectRedirect`), para uma URL pública aprovada não
redirecionar o processo local para uma rede interna.
