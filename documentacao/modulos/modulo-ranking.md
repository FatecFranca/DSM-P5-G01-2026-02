# Módulo: Ranking no servidor

> **Propósito:** descrever o ranking de itens do **Prosa** (regras como piso + modelo
> condicionado a gate de avaliação).

Arquivos: [`apps/api/app/ranking/`](../../apps/api/app/ranking/) ·
[`ml/src/alfabetiza_ml/train_ranking.py`](../../ml/src/alfabetiza_ml/train_ranking.py) ·
[`ml/src/alfabetiza_ml/replay.py`](../../ml/src/alfabetiza_ml/replay.py).

Documentos relacionados: [ADR 0004](../adr/0004-reabertura-de-ml-como-ranking.md) ·
[07 — Referência da API](../07-referencia-da-api.md).

## Endpoint

`POST /v1/ranking/next` — recebe `session_id`, `unit_id`, `candidate_item_ids`,
`session_size`, `now`; responde itens ordenados com `p_recall`, `rank`, `source`, `reason`.

## Regras como piso (`rules.py`)

- Item já visto: `p = 2^(-t/meia-vida)` descontado por lapsos.
- Item novo: prior por dificuldade descontado pela distância entre as letras exigidas e a
  fronteira do aprendiz.
- Ordem: mais esquecidos → novos na ordem do currículo → firmes.
- `RULES_POLICY_VERSION = "rules-v1"`.

## Modelo (`model.py`, `features.py`)

- Regressão logística sobre ~40 features (estado, aprendiz, conteúdo, contexto de sessão),
  calibrada por Platt, aplicada em Python puro a partir de um manifesto JSON.
- O servidor recusa manifestos sem `promotion_allowed` ou com features divergentes de
  `FEATURE_NAMES`.

## Fallback por item (`service.py`)

O fallback é **por item**, com `reason` registrado: usuário frio (< 50 tentativas), item frio
(< 2 encontros), latência > 50 ms, manifesto ausente/não promovido, `p` fora da faixa, kill
switch, ou `shadow_mode`.

## ε-exploração e shadow mode

- `RANKING_EPSILON` (5% por padrão), determinístico por `request_id`.
- `RANKING_SHADOW_MODE=true` (padrão): modelo calculado e registrado em `ranking_logs`, mas
  regras servidas.
- Toda resposta é registrada em `ranking_logs` (`request_id`, candidatos, `p_rules`,
  `p_model`, fonte, motivo, versões).

## Gate de promoção (`ml/`)

Replay sem vazamento; cortes temporal e por usuário; métricas log-loss, Brier, ECE, AUC;
baselines regras, taxa histórica e constante 0,85. `promotion_allowed` exige bater todas as
baselines em log-loss nos dois cortes, ECE ≤ 0,05 e ≥ 200 linhas por corte.

## Estado atual

`RANKING_MODEL_ENABLED` é `false` por padrão; até a assinatura pedagógica (ADR 0004), o
servidor responde `rules-fallback` com `reason=model_disabled`.
