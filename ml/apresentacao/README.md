# Scripts da apresentação

Execute sempre a partir da pasta `ml/`. Cada script é independente e mostra o resultado no terminal; os arquivos gerados vão para `ml/reports/apresentacao/`.

| Script | O que mostra |
|---|---|
| `01_seis_modelos_teste_80_20.py` | Comparação dos seis modelos no teste 80/20 (68 palavras nunca vistas). Vencedor: SVM. |
| `02_matriz_confusao_conjunto_humano.py` | Matriz de confusão dos seis modelos no conjunto humano **completo** (339 palavras), em validação cruzada de 10 partes. Gera `matriz_confusao_conjunto_humano.png`. |
| `03_svm_conjunto_humano.py` | SVM no conjunto humano: teste 80/20, validação cruzada, relatório por classe e as palavras que ele errou. Gera `svm_conjunto_humano.png`. |
| `04_svm_dataset_completo.py` | Carrega o SVM salvo (`.joblib`) e classifica o dataset principal (7.649 palavras). Gera `svm_dataset_completo.csv`. |
| `05_gravar_resultados_no_banco.py` | Regrava as tabelas `ml_experiment_runs` e `ml_word_predictions` em `apps/api/alfabetiza.db`, para abrir no DBeaver. |
| `06_humano_vs_svm_por_palavra.py` | Compara, palavra por palavra, o veredito humano com a previsão do SVM (339 palavras). Gera `conjunto_humano_vs_svm.xlsx/.csv` e a tabela `ml_conjunto_humano_comparacao` no banco. |
| `executar_tudo.sh` | Roda os seis scripts em ordem. |

## Como rodar

```bash
cd ml
.venv/bin/python apresentacao/03_svm_conjunto_humano.py      # um script
bash apresentacao/executar_tudo.sh                           # todos
.venv/bin/python apresentacao/02_matriz_confusao_conjunto_humano.py --abrir   # abre a imagem (macOS)
```

## Instalação do ambiente (se necessário)

```bash
cd ml
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -e ".[apresentacao]"
```

## Nota sobre a matriz de confusão

No conjunto humano completo, cada palavra é prevista por um modelo que não a viu no treino (validação cruzada). Treinar e testar nas mesmas 339 palavras daria uma matriz inflada por memorização.
