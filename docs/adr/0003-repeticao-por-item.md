# ADR 0003 — Repetição espaçada por item e sessão que reapresenta erros

Data: 17 de setembro de 2026. Status: aceito.

## Contexto

Até aqui o erro não produzia efeito: o progresso por lição só registrava acertos (`nextProgress`), a revisão era um intervalo fixo de 24 h nunca consumido pela interface, e a navegação da lição era linear por índice. A promessa do produto — "o sistema aprende com os erros do usuário" — não tinha nenhum mecanismo por trás.

Qualquer modelo de ranking (ADR 0004) precisa de duas coisas que não existiam: estado por item, e tentativas com contexto de sessão suficiente para distinguir "acertou de primeira" de "acertou na terceira reapresentação".

## Decisão

1. **Estado por item, não por lição.** `item_states(user, item)` com `strength`, `half_life_hours`, `due_at`, `reps`, `lapses`, `consecutive_correct`, `last_result`, `last_seen_at`. Mesmo formato no SQLite do app e no servidor. Regras (`apps/mobile/src/domain/scheduler.ts`):
   - acerto: `strength += 1`, `consecutive_correct += 1`;
   - erro: `strength = max(0, strength − 2)`, `lapses += 1`, `consecutive_correct = 0`;
   - `half_life = clamp(4h × 2^strength, 4h, 90d)`, `due_at = last_seen_at + half_life`.
   A meia-vida é a variável deliberada: é exatamente o que o ranking vai prever. Quando o modelo entrar, só a fórmula muda; o armazenamento não.
2. **Fila de sessão determinística** (`session.ts`): vencidos (`due_at ≤ agora`) primeiro, depois fracos (já erraram e ainda não recuperaram três acertos seguidos), depois novos na ordem do currículo, depois o resto como reserva. Cotas `{due: .4, weak: .3, new: .3}` com redistribuição em ordem fixa. Embaralhamento com gerador semeado (`mulberry32` sobre FNV-1a): a mesma semente produz a mesma fila; a semente varia por unidade, dia e quantidade de estados. Novos nunca são embaralhados, porque a ordem do currículo é pedagógica. Política registrada como `session-v1` em cada tentativa.
3. **Erro reapresenta o item na mesma sessão**, até três posições adiante (ou no fim). A sessão só termina com a fila vazia. Alinha com o contrato pedagógico: nova tentativa sempre, sem punição. A tentativa carrega `attempt_index_in_item`.
4. **O progresso da unidade vira resumo derivado** dos estados por item (`deriveProgress` no app, `recompute_progress` no servidor): concluída quando todo item foi acertado no último encontro; `needs_review` quando concluída e algum item venceu; um erro em item dominado devolve a unidade a `in_progress`. `GET /v1/progress` e o evento `progress` continuam existindo por compatibilidade, mas deixam de ser a verdade. `reviewCount` incrementa ao fechar uma sessão em unidade já concluída.
5. **Sync.** Novo evento `item_state`, coalescido na fila por item (`INSERT OR REPLACE`), lote de até 200. Mesclagem: último registro vence por `occurred_at`, `reps` e `lapses` só crescem — o mesmo padrão já provado para `progress`. O pull devolve estados e o app os mescla localmente.
6. **Tentativa com contexto de sessão** (o que o replay do ADR 0004 precisa): `session_id`, `position_in_session`, `attempt_index_in_item`, `audio_repeats` (contado no botão de áudio, antes nunca coletado), `time_to_first_interaction_ms` (medido do render ao primeiro toque, separado de `duration_ms`), `served_by` e `served_policy_version`. Todos opcionais no contrato.
7. **Item desconhecido é rejeitado** (422) em `attempt` e `item_state`, em vez de virar linha órfã.

## Consequências

- Errar passa a ter efeito visível (o item volta) e duradouro (meia-vida cai, item vence antes, unidade pede revisão).
- Volume de eventos cresce (um por item em vez de um por unidade); a coalescência na fila mantém o custo linear no número de itens tocados.
- `nextProgress` e o intervalo fixo de 24 h foram removidos. `lessonNeedsReview` passa a existir de fato, alimentada por `due_at`.
- O dataset de tentativas a partir desta data tem o que o replay precisa; o anterior não tem contexto de sessão e deve ser tratado como período de aquecimento.
