-- 1. Execução armazenada: fonte, divisão e modelo vencedor.
SELECT
  run_id,
  corpus_rows AS palavras_do_corpus,
  labeled_rows AS rotulos_humanos,
  train_rows AS treino_80_porcento,
  test_rows AS teste_20_porcento,
  winner_model AS modelo_vencedor,
  ROUND(winner_accuracy * 100, 2) AS accuracy_percentual,
  ROUND(winner_macro_f1 * 100, 2) AS macro_f1_percentual
FROM ml_experiment_runs;

-- 2. Quantidade prevista pelo SVM vencedor para todo o corpus.
SELECT
  predicao_selecionada AS dificuldade_prevista,
  COUNT(*) AS quantidade
FROM ml_word_predictions
WHERE run_id = 'dificuldade-lexical-svm-v1'
GROUP BY predicao_selecionada
ORDER BY quantidade DESC;

-- 3. Amostra com as previsões dos seis modelos.
SELECT
  palavra,
  estrutura_silabica,
  frequencia,
  predicao_lr,
  predicao_lda,
  predicao_knn,
  predicao_cart,
  predicao_nb,
  predicao_svm,
  concordancia_modelos
FROM ml_word_predictions
WHERE run_id = 'dificuldade-lexical-svm-v1'
ORDER BY palavra
LIMIT 30;

-- 4. Palavras prioritárias para revisão humana: menor concordância entre modelos.
SELECT
  palavra,
  estrutura_silabica,
  frequencia,
  predicao_lr,
  predicao_lda,
  predicao_knn,
  predicao_cart,
  predicao_nb,
  predicao_svm,
  concordancia_modelos
FROM ml_word_predictions
WHERE run_id = 'dificuldade-lexical-svm-v1'
ORDER BY concordancia_modelos ASC, palavra
LIMIT 30;

-- 5. Palavras em que todos os seis modelos concordaram com o SVM.
SELECT
  palavra,
  estrutura_silabica,
  predicao_selecionada
FROM ml_word_predictions
WHERE run_id = 'dificuldade-lexical-svm-v1'
  AND concordancia_modelos = 6
ORDER BY palavra
LIMIT 30;
