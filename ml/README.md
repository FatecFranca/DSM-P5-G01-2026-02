# Aprendizado de máquina: ranking de itens e artefatos históricos

Este diretório treina e avalia o **modelo de ranking** servido pela API (`docs/adr/0004`). Ele não roda no aplicativo: o servidor aplica um manifesto JSON com coeficientes em Python puro, e as regras continuam como piso quando o modelo não pode responder.

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[test]" -e "../apps/api[dev]"
.\.venv\Scripts\python -m pytest
```

## O que o modelo faz e o que não faz

- Alvo: probabilidade de o aprendiz acertar um item no próximo encontro (`p_recall`).
- Só **reordena** itens que já estão elegíveis pelo portão de letras. Nunca libera conteúdo, nunca altera dificuldade, nunca decide conteúdo sem curadoria.
- Features, regras e scheduler são os mesmos do servidor (`apps/api/app/ranking`), importados daqui. O replay reconstrói o estado do item e do aprendiz como estavam antes de cada tentativa, sem vazamento de futuro.

## Treinar e avaliar

```powershell
.\.venv\Scripts\python -m alfabetiza_ml.train_ranking --database-url "postgresql+psycopg://..." --out artifacts\ranking_manifest.json --report reports\ranking_eval.json
```

Só tentativas de usuários com `research_consent` entram (`PUT /v1/me/research-consent`). Dois cortes obrigatórios: temporal (passado → futuro) e por usuário (usuários inéditos, mede cold start). Métricas: log-loss, Brier, ECE com diagrama de confiabilidade e AUC. Baselines obrigatórias: regras do servidor, taxa histórica por item e constante 0,85.

O manifesto só recebe `promotion_allowed: true` se o modelo bater todas as baselines em log-loss nos dois cortes, tiver ECE ≤ 0,05 e ao menos 200 linhas por corte. O servidor recusa manifestos não promovidos. Com uma turma de validação o gate provavelmente reprova; esse é o resultado esperado, não uma falha.

## Servir

Na API: `RANKING_MODEL_ENABLED=true`, `RANKING_MODEL_PATH=/caminho/ranking_manifest.json`. Comece com `RANKING_SHADOW_MODE=true` (o modelo é calculado e registrado em `ranking_logs`, mas as regras são servidas) por 2–4 semanas antes de inverter. `RANKING_EPSILON` (5% por padrão) reserva parte das posições para exploração, sem a qual a avaliação off-policy fica inválida. Desligar é o kill switch.

## Artefatos históricos

`src/alfabetiza_ml/legacy/handwriting` e `artifacts/legacy` guardam o classificador de letra manuscrita da prova técnica (dataset sintético, `promotionAllowed: false`). Ele está fora do produto: não é importado pelo app e não participa das lições. `tabular.py` são as regras de dificuldade e recomendação do bootstrap, hoje superadas por `apps/api/app/ranking/rules.py`.
