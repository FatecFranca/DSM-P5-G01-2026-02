"""Compara seis modelos usando rótulos consolidados dos avaliadores humanos."""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[3]
CORPUS = ROOT / 'ml/data/Corpus_SANTOS_TONI_FDC_tratado_sem_repeticoes_final.xlsx'
HUMAN_LABELS = ROOT / 'ml/data/difficulty_labels_humanas_consolidadas.csv'
LABELS = ['facil', 'medio', 'dificil']


def normalize_structure(value: object) -> list[str]:
    return [item for item in str(value).strip().removeprefix('&').removesuffix('%').upper().split('-') if item]


def features(frame: pd.DataFrame) -> pd.DataFrame:
    rows=[]
    for row in frame.itertuples(index=False):
        shapes=normalize_structure(row.ESTSILABICA)
        word=str(row.PALAVRA).lower()
        rows.append({
            'syllable_count':len(shapes), 'complex_syllable_count':sum(s not in {'V','CV','CVV'} for s in shapes),
            'cluster_count':sum(s.startswith('CC') for s in shapes), 'max_shape_length':max(map(len,shapes),default=0),
            'coda_count':sum(s.endswith(('C','S','G')) for s in shapes), 'glide_count':sum('G' in s for s in shapes),
            'word_length':len(word), 'accented':int(bool(re.search('[áéíóúâêôãõàüç]',word))),
            'digraph_count':sum(word.count(token) for token in ('ch','lh','nh','rr','ss','qu','gu')),
            'complex_grapheme_count':word.count('x')+word.count('ç'), 'log_frequency':float(np.log1p(float(row.FREQ))),
        })
    return pd.DataFrame(rows)


def consolidated_labels() -> pd.DataFrame:
    labels = pd.read_csv(HUMAN_LABELS)
    invalid = set(labels['DIFICULDADE']) - set(LABELS)
    if invalid:
        raise ValueError(f'rótulos humanos inválidos: {sorted(invalid)}')
    return labels.drop_duplicates('PALAVRA', keep='last')


def models() -> dict[str, object]:
    return {
        'LR':Pipeline([('scale',StandardScaler()),('model',LogisticRegression(max_iter=2000,class_weight='balanced',random_state=7))]),
        'LDA':Pipeline([('scale',StandardScaler()),('model',LinearDiscriminantAnalysis())]),
        'KNN':Pipeline([('scale',StandardScaler()),('model',KNeighborsClassifier(n_neighbors=5))]),
        'CART':DecisionTreeClassifier(class_weight='balanced',random_state=7),
        'NB':GaussianNB(),
        'SVM':Pipeline([('scale',StandardScaler()),('model',SVC(class_weight='balanced',random_state=7))]),
    }


def run() -> dict:
    labels=consolidated_labels(); corpus=pd.read_excel(CORPUS).drop_duplicates('PALAVRA')
    data=labels.merge(corpus,on='PALAVRA',how='inner').drop_duplicates('LEMA')
    X=features(data); y=data['DIFICULDADE']
    X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.20,stratify=y,random_state=7)
    results=[]
    for name,model in models().items():
        model.fit(X_train,y_train); predicted=model.predict(X_test)
        results.append({'model':name,'accuracy':float(accuracy_score(y_test,predicted)),'macro_f1':float(f1_score(y_test,predicted,average='macro')),'confusion_matrix':confusion_matrix(y_test,predicted,labels=LABELS).tolist(),'report':classification_report(y_test,predicted,labels=LABELS,output_dict=True)})
    results.sort(key=lambda result:(-result['macro_f1'],-result['accuracy'],result['model']))
    return {'dataset_rows':len(data),'class_counts':data['DIFICULDADE'].value_counts().to_dict(),'train_rows':len(X_train),'test_rows':len(X_test),'features':list(X.columns),'results':results}


if __name__ == '__main__':
    output=ROOT/'ml/reports/human_ratings_six_model_benchmark.json'; output.parent.mkdir(parents=True,exist_ok=True)
    report=run(); output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'dataset_rows':report['dataset_rows'],'test_rows':report['test_rows'],'results':[{k:v for k,v in item.items() if k in {'model','accuracy','macro_f1'}} for item in report['results']]},ensure_ascii=False))
