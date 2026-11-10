#!/usr/bin/env bash
# Executa, em ordem, todos os scripts da apresentação. Rode a partir de qualquer pasta.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=".venv/bin/python"

for script in 01_seis_modelos_teste_80_20 02_matriz_confusao_conjunto_humano 03_svm_conjunto_humano 04_svm_dataset_completo 05_gravar_resultados_no_banco 06_humano_vs_svm_por_palavra; do
  echo
  echo "##### ${script}.py #####"
  "$PY" "apresentacao/${script}.py"
done
echo
echo "Concluído. Arquivos gerados em ml/reports/apresentacao/"
