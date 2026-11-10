"""SVM no conjunto humano completo: teste 80/20, validação cruzada e palavras erradas."""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score, train_test_split

from _comum import LABELS, SAIDA, SEMENTE, abrir, conjunto_humano, desenhar_matriz, models, tabela_matriz, titulo

dados, X, y = conjunto_humano()
print(f"Conjunto humano: {len(dados)} palavras | {y.value_counts().to_dict()}")

titulo("SVM — teste reservado (80% treino / 20% teste)")
X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.20, stratify=y, random_state=SEMENTE)
svm = models()["SVM"].fit(X_treino, y_treino)
previsto_teste = svm.predict(X_teste)
matriz_teste = confusion_matrix(y_teste, previsto_teste, labels=LABELS)
print(f"Treino: {len(X_treino)} | Teste: {len(X_teste)}")
print(f"Accuracy: {accuracy_score(y_teste, previsto_teste):.2%} | Macro-F1: {f1_score(y_teste, previsto_teste, average='macro'):.2%}\n")
print(tabela_matriz(matriz_teste).to_string())
print("\n" + classification_report(y_teste, previsto_teste, labels=LABELS, digits=3))

erros = dados.loc[X_teste.index].assign(PREVISTO=previsto_teste)
erros = erros[erros["DIFICULDADE"] != erros["PREVISTO"]][["PALAVRA", "ESTSILABICA", "DIFICULDADE", "PREVISTO"]]
print(f"Palavras que o SVM errou no teste ({len(erros)}):")
print(erros.rename(columns={"DIFICULDADE": "HUMANO"}).to_string(index=False))

titulo(f"SVM — conjunto humano completo ({len(dados)} palavras, validação cruzada 10 partes)")
validacao = StratifiedKFold(n_splits=10, shuffle=True, random_state=SEMENTE)
macro_por_parte = cross_val_score(models()["SVM"], X, y, cv=validacao, scoring="f1_macro")
previsto_cv = cross_val_predict(models()["SVM"], X, y, cv=validacao)
matriz_cv = confusion_matrix(y, previsto_cv, labels=LABELS)
print(f"Macro-F1 médio: {macro_por_parte.mean():.2%} (desvio {macro_por_parte.std():.2%})")
print(f"Accuracy geral: {accuracy_score(y, previsto_cv):.2%}\n")
print(tabela_matriz(matriz_cv).to_string())
print("\n" + classification_report(y, previsto_cv, labels=LABELS, digits=3))

figura, (eixo_a, eixo_b) = plt.subplots(1, 2, figsize=(11, 4.8))
desenhar_matriz(eixo_a, matriz_teste, f"Teste reservado ({len(X_teste)} palavras)")
desenhar_matriz(eixo_b, matriz_cv, f"Conjunto humano completo ({len(dados)}, validação cruzada)")
figura.suptitle("SVM — matriz de confusão", fontsize=13)
figura.tight_layout()
SAIDA.mkdir(parents=True, exist_ok=True)
destino = SAIDA / "svm_conjunto_humano.png"
figura.savefig(destino, dpi=150)
print(f"Imagem salva em: {destino}")
abrir(destino)
