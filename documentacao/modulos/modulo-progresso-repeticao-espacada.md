# Módulo: Progresso e repetição espaçada

> **Propósito:** descrever o estado por item, a fila de sessão e o progresso derivado do
> **Prosa**.

Arquivos: [`apps/mobile/src/domain/scheduler.ts`](../../apps/mobile/src/domain/scheduler.ts) ·
[`apps/mobile/src/domain/session.ts`](../../apps/mobile/src/domain/session.ts) ·
[`apps/api/app/ranking/scheduler.py`](../../apps/api/app/ranking/scheduler.py) ·
[`apps/api/app/sync.py`](../../apps/api/app/sync.py) (recompute).

Documentos relacionados: [ADR 0003](../adr/0003-repeticao-por-item.md) ·
[06 — Banco de dados](../06-banco-de-dados.md).

## Estado por item (`item_states`)

Campos: `strength`, `half_life_hours`, `due_at`, `reps`, `lapses`, `consecutive_correct`,
`last_result`, `last_seen_at`.

Regras (espelhadas em `scheduler.ts` e `scheduler.py`):

- Acerto: `strength += 1`, `consecutive_correct += 1`.
- Erro: `strength = max(0, strength - 2)`, `lapses += 1`, `consecutive_correct = 0`.
- `half_life = clamp(4h × 2^strength, 4h, 90d)`, `due_at = last_seen_at + half_life`.

## Fila de sessão determinística (`session.ts`)

Ordem: vencidos (`due_at ≤ agora`) → fracos (erraram e não recuperaram 3 acertos seguidos) →
novos (ordem do currículo) → reserva. Cotas `{due: .4, weak: .3, new: .3}` com
redistribuição. Embaralhamento com gerador semeado (FNV-1a + mulberry32); novos nunca são
embaralhados.

## Reapresentação de erro

O item errado volta à sessão em até três posições adiante (ou no fim). A tentativa carrega
`attempt_index_in_item`.

## Progresso derivado

`deriveProgress` (mobile) / `recompute_progress` (API): a unidade é `completed` quando todos
os itens foram acertados no último encontro; `needs_review` quando algum item venceu; um erro
em item dominado devolve a `in_progress`. `GET /v1/progress` e o evento `progress` são
mantidos por compatibilidade, mas os estados por item são a verdade.
