"""Ranking de itens no servidor (docs/adr/0004).

O modelo só reordena candidatos já elegíveis; nunca altera elegibilidade nem libera conteúdo.
As regras (`rules.py`) são o piso: servem sempre que o modelo não pode.
"""
