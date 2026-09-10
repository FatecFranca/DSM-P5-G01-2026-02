# Artefatos experimentais de análise

Este diretório está fora do produto atual. Ele preserva uma prova técnica histórica para referência e CI, mas não é importado pelo mobile, não participa do desbloqueio das lições e não deve ser tratado como requisito do MVP.

Pipeline reproduzível para a prova técnica. O dataset gerado é **sintético e exclusivo para demo/CI**; o manifesto impede sua promoção como modelo avaliado com pessoas reais.

```powershell
cd ml
python -m pip install -e ".[test,onnx]"
pytest
python -m alfabetiza_ml.train --output artifacts
```

O split usa `GroupShuffleSplit` com o escritor como grupo, impedindo que amostras da mesma pessoa apareçam em treino e teste. `metrics.json` registra accuracy, precision/recall/F1 macro, matriz de confusão e latência Python. `manifest.json` registra versão, hash, tamanho, classes, limiar de incerteza e escritores de cada partição.

Com `skl2onnx`, o artefato é `letter_classifier.onnx`. Sem a dependência opcional, é produzido `joblib` somente para diagnóstico Python, e o manifesto declara que ONNX não está disponível; esse fallback **não é compatível com o app mobile**.

`inference.py` fornece um smoke test do contrato `{className, confidence, uncertain, modelVersion}`. Imagens PIL têm sua orientação EXIF aplicada antes do recorte; o canvas mobile, que não possui EXIF, deve ser exportado na orientação canônica da tela.

`tabular.py` é um experimento histórico de regras de dificuldade e recomendação. A trilha atual usa regras explícitas no catálogo e não inclui escrita, traçado, reconhecimento manuscrito ou modelo adaptativo.
