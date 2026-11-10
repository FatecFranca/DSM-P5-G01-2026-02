"""Testes da carga do banco de questões. Rode da raiz: `python -m pytest bancoquestoesequiz`.

O teste de integração usa um PostgreSQL de testes com as migrações da API aplicadas, indicado por
PROSA_TEST_DATABASE_URL (ex.: postgresql://prosa@127.0.0.1:55432/prosa_teste); sem a variável, ele é pulado.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PASTA = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PASTA))

import gerar_banco  # noqa: E402
from importar_base_tratada import dificuldade_por_votacao  # noqa: E402

RAIZ = PASTA.parent
CONTRATO = json.loads((RAIZ / "contracts" / "placement-quiz.json").read_text(encoding="utf-8"))
ITENS = list(gerar_banco.itens())
POR_ID = {linha[0]: linha for linha in ITENS}


def dados(id_):
    return POR_ID[id_][4]


def rotacoes(sequencia):
    return [sequencia[i:] + sequencia[:i] for i in range(len(sequencia))]


def test_quiz_sql_versionado_e_gerado_do_contrato():
    assert (PASTA / "quiz_nivelamento.sql").read_text(encoding="utf-8") == gerar_banco.quiz_sql()
    sql = gerar_banco.quiz_sql()
    for item in CONTRATO["items"]:
        assert f"('{item['id']}', {item['order']}, '{item['band']}', {item['level']}, '{item['skill']}'" in sql


def test_ordenar_frase_nao_entrega_a_resposta_por_rotacao():
    for id_, modelo, *_ in ITENS:
        if modelo == "4A":
            pecas, resposta = dados(id_)["pecas"], POR_ID[id_][5]
            assert sorted(pecas) == sorted(resposta)
            assert pecas not in rotacoes(resposta), id_


def test_ligar_imagens_nao_segue_padrao_de_rotacao():
    for id_, modelo, *_ in ITENS:
        if modelo == "3B":
            imagens = [imagem["termo"] for imagem in dados(id_)["imagens"]]
            assert imagens not in rotacoes(dados(id_)["opcoes"]), id_


@pytest.mark.parametrize("modelo", ["1A", "3A"])
def test_distratores_da_letra_inicial_sao_do_mesmo_grupo(modelo):
    for id_, modelo_item, *_ in ITENS:
        if modelo_item != modelo:
            continue
        letra = POR_ID[id_][5]
        grupo = set("AEIOU") if letra in "AEIOU" else set("ABCDEFGHIJKLMNOPQRSTUVWXYZ") - set("AEIOU")
        assert set(dados(id_)["opcoes"]) <= grupo, id_


def test_frase_da_cena_tem_distratores_de_par_minimo():
    for id_, modelo, *_ in ITENS:
        if modelo != "4B":
            continue
        resposta, opcoes = POR_ID[id_][5], dados(id_)["opcoes"]
        assert resposta in opcoes and len(set(opcoes)) == len(opcoes) == 3
        for distrator in (opcao for opcao in opcoes if opcao != resposta):
            # Distrator plausível: compartilha a estrutura da frase e muda pouco (QUIZ_NIVELAMENTO.md, revisão pedagógica).
            comuns = set(distrator.split()) & set(resposta.split())
            assert len(comuns) >= 2, (id_, distrator)


def test_carga_atualiza_rascunhos_sem_tocar_em_aprovados():
    sql = gerar_banco.gerar_sql()
    assert "ON CONFLICT (id) DO UPDATE" in sql
    assert "WHERE banco_questoes.questoes_fixas.status = 'rascunho'" in sql
    assert "WHERE banco_questoes.variacoes.status = 'rascunho'" in sql
    assert "banco_questoes.variacoes_pendentes" in sql


@pytest.mark.parametrize(("votos", "esperado"), [
    (("facil", "facil", "medio"), "facil"), (("dificil", "medio", "dificil"), "dificil"),
    (("facil", "medio", "dificil"), "medio"), ((None, None, None), None), (("medio", None, None), "medio"),
])
def test_dificuldade_por_votacao_dos_modelos_humanos(votos, esperado):
    assert dificuldade_por_votacao(votos) == esperado


def psql(url, *args, stdin=None):
    return subprocess.run(["psql", url, "-X", "-q", "-v", "ON_ERROR_STOP=1", *args], input=stdin, capture_output=True, text=True, check=True)


@pytest.mark.skipif(not os.environ.get("PROSA_TEST_DATABASE_URL") or not shutil.which("psql"), reason="sem PostgreSQL de testes")
def test_carga_real_corrige_o_quiz_igual_ao_contrato_e_aceita_recarga():
    url = os.environ["PROSA_TEST_DATABASE_URL"]
    sql = gerar_banco.gerar_sql()
    psql(url, stdin=sql)
    resultado = psql(url, stdin=sql)
    assert "variações não montadas" in resultado.stderr
    for exemplo in CONTRATO["examples"]:
        respostas = json.dumps(exemplo["responses"]).replace("'", "''")
        consulta = (f"SELECT row_to_json(r) FROM banco_questoes.corrigir_quiz('{respostas}'::jsonb, {str(exemplo.get('skipped', False)).lower()}) r;")
        resultado = json.loads(psql(url, "-tA", "-c", consulta).stdout)
        esperado = exemplo["expected"]
        assert [resultado["acertos_faceis"], resultado["acertos_medios"], resultado["acertos_dificeis"]] == [esperado["hits"][f] for f in ("facil", "medio", "dificil")], exemplo["name"]
        assert resultado["dificuldade"] == esperado["difficulty"] and resultado["provisoria"] is esperado["provisional"], exemplo["name"]
        assert resultado["motivo_provisorio"] == esperado["provisional_reason"] and resultado["nivel_inicial"] == esperado["start_level"], exemplo["name"]
    contagens = psql(url, "-tA", "-c", "SELECT count(*) FROM banco_questoes.quiz_itens WHERE nivel IS NOT NULL").stdout.strip()
    assert contagens == "12"
