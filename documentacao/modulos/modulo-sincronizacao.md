# Módulo: Sincronização

> **Propósito:** descrever a sincronização offline/online do **Prosa** (push/pull
> idempotente entre o app e a API).

Arquivos: [`apps/api/app/sync.py`](../../apps/api/app/sync.py) ·
[`apps/api/app/schemas.py`](../../apps/api/app/schemas.py) ·
[`apps/mobile/src/sync/`](../../apps/mobile/src/sync/) ·
[`apps/mobile/src/storage/database.ts`](../../apps/mobile/src/storage/database.ts).

Documentos relacionados: [07 — Referência da API](../07-referencia-da-api.md) ·
[ADR 0001](../adr/0001-conteudo-server-driven.md) ·
[ADR 0003](../adr/0003-repeticao-por-item.md).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/sync/push` | envia lote de eventos (`attempt`, `item_state`, `progress`) |
| GET | `/v1/sync/pull?cursor=&limit=` | lê eventos do servidor |

## Eventos e idempotência

- `client_event_id` (por evento) e `client_attempt_id` (por tentativa) são idempotentes por
  usuário, com unicidade no banco.
- O push grava eventos no `sync_events` e aplica os efeitos correspondentes
  (`attempt` → `attempts`; `item_state` → `item_states` + recomputa progresso;
  `progress` → `progress`).

## Rejeição por evento (emenda ADR 0001)

Um evento cujo item/unidade não existe no catálogo atual é **rejeitado com motivo**, sem
derrubar o lote. A resposta inclui `accepted`, `duplicates`, `accepted_ids`, `rejected`,
`rejected_ids` e `rejections`. O cliente remove da fila aceitos e rejeitados.

## Mesclagem

- **Item state:** último registro vence por `occurred_at`; `reps` e `lapses` só crescem.
- **Progresso:** `completed_types` só acumula; uma unidade concluída não regride (exceto para
  revisão); o restante é last-write-wins pelo relógio do cliente.
- **Pull:** devolve eventos com cursor para o cliente mesclar localmente.

## Fluxo no mobile

1. Eventos entram na fila local (`SQLite`).
2. `syncNow()` (em `use-sync.ts`) envia o lote e processa rejeições.
3. Renovação automática do access token via `session-retry.ts` (encerra a sessão se o
   refresh for recusado).
4. `pullEvents` traz o que veio de outros aparelhos e o estado remoto é aplicado.
