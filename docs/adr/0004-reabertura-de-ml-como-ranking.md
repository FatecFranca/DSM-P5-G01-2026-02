# ADR 0004 — Reabertura de ML como ranking no servidor

Data: 18 de setembro de 2026. Status: aceito, condicionado ao gate de avaliação e à assinatura pedagógica abaixo.

## Contexto

`PROJECT_FOUNDATION.md` ("Adaptação de conteúdo"), `MVP_IMPLEMENTATION_PLAN.md` (etapa 4 e "Premissas e limites") e `apps/mobile/README.md` declaravam modelos estatísticos fora do produto, condicionando qualquer retorno a "dados suficientes, avaliação separada, revisão pedagógica e comparação explícita com as regras". Este ADR é a decisão explícita que esses documentos pedem; ele não os contradiz — implementa exatamente o gate que descrevem.

O que existia de ML no repositório era um classificador de letra manuscrita sobre dados sintéticos, removido do app em `9eea1d3`, e regras de dificuldade em `ml/tabular.py`. Nenhum dos dois é o que a visão do produto quer ("aprender com acertos e erros para escolher os próximos exercícios").

## Decisão

1. **Escopo.** O modelo prevê `p_recall(aprendiz, item, agora)` — a probabilidade de acerto no próximo encontro — e **só reordena** candidatos já elegíveis pelo portão de letras (ADR 0002). Nunca altera elegibilidade, nunca libera conteúdo, nunca decide dificuldade ou conteúdo sem curadoria, nunca gamifica punição. As restrições da sessão (ADR 0003) continuam valendo como piso.
2. **Onde roda.** No servidor, `POST /v1/ranking/next`. O app monta a sessão localmente e chama o ranking de forma opcional, com tempo limite curto; sem rede, a sessão local vale. O servidor aplica um manifesto JSON de regressão logística em Python puro (`app/ranking/model.py`); treino e avaliação vivem em `ml/` e importam as mesmas features, regras e scheduler do servidor, para que o que se avalia seja o que se serve.
3. **Regras como piso** (`app/ranking/rules.py`): item já visto tem `p = 2^(-t/meia-vida)` descontado por lapsos; item novo tem prior por dificuldade descontado pela distância entre suas letras e a fronteira do aprendiz. Ordem: mais esquecidos, depois novos na ordem do currículo, depois firmes. O fallback é **por item**: cai para regras em usuário frio (< 50 tentativas), item frio (< 2 encontros), latência > 50 ms, manifesto ausente ou não promovido, `p` fora da faixa calibrada, ou kill switch (`RANKING_MODEL_ENABLED=false`). `reason` registra o motivo em cada item.
4. **Shadow mode primeiro** (`RANKING_SHADOW_MODE=true`, padrão): o modelo é calculado e registrado em `ranking_logs`, mas as regras são servidas, por 2–4 semanas antes de inverter. Toda resposta é registrada (`request_id`, candidatos, `p_rules`, `p_model`, fonte, motivo, versões); a tentativa devolve `served_by`, `served_policy_version` e `served_model_version`, fechando o par requisição↔resultado.
5. **ε-exploração** (`RANKING_EPSILON`, 5% por padrão), determinística por `request_id`, desde o shadow mode: sem ela o ranking enviesa os próprios dados futuros e a avaliação off-policy fica inválida.
6. **Gate de promoção** (`ml/src/alfabetiza_ml/train_ranking.py`): replay das tentativas sem vazamento de futuro; dois cortes obrigatórios (temporal e por usuário); métricas log-loss, Brier, ECE com diagrama de confiabilidade e AUC; baselines obrigatórias regras, taxa histórica por item e constante 0,85. `promotion_allowed` só é verdadeiro se o modelo bater **todas** as baselines em log-loss nos dois cortes, com ECE ≤ 0,05 e ≥ 200 linhas por corte. O servidor recusa manifestos não promovidos. Com uma turma de validação o gate provavelmente reprova — resultado correto, não falha.
7. **Consentimento.** `users.research_consent` (`PUT /v1/me/research-consent`), separado do cadastro como exige `PRIVACY_AND_ACCESSIBILITY.md`; só tentativas de quem consentiu entram no treino. Retreino semanal, artefato versionado por data e hash das features, rollback = trocar a variável de ambiente.
8. **Modelo inicial:** regressão logística sobre ~40 features derivadas do estado por item, do aprendiz, do conteúdo e do contexto de sessão, calibrada por Platt. Half-life regression propriamente dita fica como segunda iteração, com volume.

## Proibições explícitas

O ranking não pode: liberar itens cujas letras não foram dominadas; remover ou reordenar o que a sessão determinística reserva (≥ 1 vencido, ≥ 1 novo quando houver); alterar dificuldade, status de revisão ou conteúdo; ser servido sem `promotion_allowed`; usar tentativas sem consentimento.

## Revisão pedagógica

Responsável nomeado em `PEDAGOGICAL_CONTRACT.md`: ____________________ Data: ____/____/______

Assinatura pendente. Até ela, `RANKING_MODEL_ENABLED` permanece `false` em produção.

## Consequências

- `ml/` deixa de ser "histórico" e passa a ser o pipeline de avaliação do produto; o classificador manuscrito vai para `ml/legacy/handwriting`.
- Uma feature nova exige mudar `FEATURE_NAMES`, retreinar e republicar o manifesto; o servidor recusa manifestos com features diferentes.
- O custo de servir é desprezível (uma soma ponderada por item); o custo real é curadoria de consentimento e disciplina de avaliação.
