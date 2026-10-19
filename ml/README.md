# Aprendizado de máquina: dificuldade lexical e ranking

Este diretório cobre dois eixos do Prosa:

1. **Classificador supervisionado de dificuldade lexical** (`facil` / `medio` / `dificil`) a partir de features silábicas — alinhado à proposta do artigo.
2. **Modelo de ranking** servido pela API (`docs/adr/0004`), que só reordena itens já elegíveis.

Nenhum modelo roda no aplicativo: a API e os scripts consomem manifestos JSON com coeficientes em Python puro.

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\python -m pip install -e ".[test]" -e "../apps/api[dev]"
.\.venv\Scripts\python -m pytest
```

## Classificador de dificuldade lexical

```powershell
.\.venv\Scripts\python -m alfabetiza_ml.train_difficulty --out artifacts\difficulty_manifest.json --report reports\difficulty_eval.json
.\.venv\Scripts\python -m alfabetiza_ml.relabel_word_bank --manifest artifacts\difficulty_manifest.json
```

- Entrada: `ml/data/difficulty_labels.json` (rótulos curados/pedagógicos).
- Features: contagem de sílabas, comprimento, acentos, encontros consonantais, formas silábicas (CVC, CCV…) e frequência.
- Gate: macro-F1 ≥ 0,70 em validação cruzada estratificada e as três classes presentes.
- O manifesto promovido reetiqueta candidatos em `apps/api/app/data/word_bank.json`. Palavras curadas em `content_data.WORDS` **não** são sobrescritas.
- Fallback seguro: `tabular.classify_word_difficulty` continua com regras bootstrap se o manifesto não existir.

A dificuldade lexical alimenta o ranking (prior/feature) e a organização do banco de candidatos. A recomendação online de itens continua sendo regras + ranking (ADR 0004), não o classificador lexical sozinho.

## Ranking (ADR 0004)

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

`src/alfabetiza_ml/legacy/handwriting` e `artifacts/legacy` guardam o classificador de letra manuscrita da prova técnica (dataset sintético, `promotionAllowed: false`). Ele está fora do produto: não é importado pelo app e não participa das lições. `tabular.py` mantém o fallback de regras e a recomendação bootstrap de tipo de atividade.
