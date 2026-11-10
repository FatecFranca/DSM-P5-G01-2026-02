"""Matriz de confusão dos seis modelos no conjunto humano COMPLETO (339 palavras).

Cada palavra é prevista por um modelo que NÃO a viu no treino (validação cruzada
estratificada de 10 partes), então a matriz não é inflada por memorização.
"""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from _comum import LABELS, SAIDA, SEMENTE, abrir, conjunto_humano, desenhar_matriz, models, tabela_matriz, titulo

dados, X, y = conjunto_humano()
validacao = StratifiedKFold(n_splits=10, shuffle=True, random_state=SEMENTE)

titulo(f"Matriz de confusão — conjunto humano completo ({len(dados)} palavras, validação cruzada 10 partes)")
figura, eixos = plt.subplots(2, 3, figsize=(14, 8.5))
resumo = []
for eixo, (nome, modelo) in zip(eixos.ravel(), models().items()):
    previsto = cross_val_predict(modelo, X, y, cv=validacao)
    matriz = confusion_matrix(y, previsto, labels=LABELS)
    acuracia = accuracy_score(y, previsto)
    macro_f1 = f1_score(y, previsto, average="macro")
    resumo.append((nome, acuracia, macro_f1))
    desenhar_matriz(eixo, matriz, f"{nome}  |  acc {acuracia:.1%}  F1 {macro_f1:.1%}")
    print(f"\n{nome}  —  accuracy {acuracia:.2%}  |  Macro-F1 {macro_f1:.2%}")
    print(tabela_matriz(matriz).to_string())

figura.suptitle(f"Matriz de confusão — {len(dados)} palavras com rótulo humano (validação cruzada)", fontsize=14)
figura.tight_layout()
SAIDA.mkdir(parents=True, exist_ok=True)
destino = SAIDA / "matriz_confusao_conjunto_humano.png"
figura.savefig(destino, dpi=150)

print("\nRanking por Macro-F1:")
for nome, acuracia, macro_f1 in sorted(resumo, key=lambda item: -item[2]):
    print(f"  {nome:5s} accuracy {acuracia:.2%}  Macro-F1 {macro_f1:.2%}")
print(f"\nImagem salva em: {destino}")
abrir(destino)
