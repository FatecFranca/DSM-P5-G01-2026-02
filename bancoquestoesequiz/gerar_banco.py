"""Gera uma carga PostgreSQL a partir da curadoria versionada neste arquivo."""

import argparse
import json
import random
from pathlib import Path
from string import ascii_uppercase
from unicodedata import normalize

RAIZ = Path(__file__).resolve().parents[1]


# Duas palavras por letra para a sequência do nível 3.
PALAVRAS_POR_LETRA = (
    "ABELHA ANJO", "BOLSA BOLO", "CASA COPO", "DADO DENTE", "ESCADA ESCOVA",
    "FOLHA FOCA", "GATO GARRAFA", "HARPA HELICÓPTERO", "IGREJA ILHA",
    "JANELA JARRA", "KIMONO KETCHUP", "LARANJA LATA", "MARTELO MAÇÃ",
    "NAVIO NUVEM", "OVO ORELHA", "PONTE PERA", "QUEIJO QUADRO", "RELÓGIO RATO",
    "SAPATO SOL", "TAPETE TOMATE", "UVA URSO", "VACA VELA", "WAFFLE WI-FI",
    "XÍCARA XALE", "YOGA YAKISOBA", "ZEBRA ZÍPER",
)

SILABAS_POR_PALAVRA = (
    "CA SA", "DA DO", "BO LO", "SOR VE TE", "NA VI O", "CA ME LO", "BA NA NA",
    "ME SA", "SA PA TO", "PA NE LA", "TA PE TE", "JA NE LA", "FO LHA",
    "CO PO", "U VA", "TO MA TE", "MA ÇÃ", "RA TO",
)

# A imagem descreve o que deve ser ilustrado na produção.
CENAS = (
    ("A LARANJA É UMA FRUTA", "LARANJA", "uma laranja"),
    ("O COPO ESTÁ NA MESA", "COPO", "um copo"),
    ("A MENINA BRINCA NO BALANÇO", "BALANÇO", "um balanço"),
    ("O GATO DORME NA CADEIRA", "GATO", "um gato"),
    ("O MENINO LÊ UM LIVRO", "LIVRO", "um livro"),
    ("A MULHER SEGURA UMA BOLSA", "BOLSA", "uma bolsa"),
)

# 4B: distratores de par mínimo (mudam uma palavra), para que a resposta dependa de ler a frase inteira e olhar a cena.
# O da menina vem do arquivo original da curadoria. O destaque orienta a ilustração a mostrar o que diferencia as opções.
DISTRATORES_CENA = {
    "A LARANJA É UMA FRUTA": (("A LARANJA É UMA FLOR", "A BANANA É UMA FRUTA"), "Mostrar uma laranja inteira, sem outras frutas nem flores."),
    "O COPO ESTÁ NA MESA": (("O COPO ESTÁ NO CHÃO", "O PRATO ESTÁ NA MESA"), "Mostrar só um copo, em cima da mesa, sem prato."),
    "A MENINA BRINCA NO BALANÇO": (("A MENINA GOSTA DE CHOCOLATE", "A MENINA NADA"), "Mostrar a menina sentada no balanço, em movimento."),
    "O GATO DORME NA CADEIRA": (("O GATO COME NA CADEIRA", "O CACHORRO DORME NA CADEIRA"), "Mostrar um gato de olhos fechados, sem comida por perto."),
    "O MENINO LÊ UM LIVRO": (("O MENINO RASGA UM LIVRO", "A MENINA LÊ UM LIVRO"), "Mostrar um menino com o livro aberto, olhando as páginas."),
    "A MULHER SEGURA UMA BOLSA": (("A MULHER SEGURA UMA SACOLA", "O HOMEM SEGURA UMA BOLSA"), "Mostrar uma mulher segurando uma bolsa com alça, sem sacolas."),
}

# Cada estratégia tem um enunciado e uma regra de montagem no esquema SQL.
DINAMICOS = {
    "1A": ("inicial_imagem", "Selecione a {grupo} inicial do nome do desenho."),
    "1C": ("vizinhos", "Escreva as letras que vêm antes e depois."),
    "1D": ("extremos_palavra", "Leia a palavra e escreva a primeira e a última letra."),
    "1E": ("escuta", "Toque para ouvir e selecione a letra que escutar."),
    "2B": ("lacuna_silabica", "Complete com a sílaba {posicao}."),
    "2D": ("separar", "Separe a palavra em sílabas."),
    "2E": ("formar", "Escreva a palavra formada por estas sílabas."),
    "2F": ("escuta", "Toque para ouvir e selecione a sílaba que escutar."),
    "3A": ("inicial_imagem", "Selecione a letra inicial do nome do desenho."),
}


def chave(texto):
    return "-".join(normalize("NFKD", texto).encode("ascii", "ignore").decode().lower().split())


def imagem(termo, descricao=None):
    return {"id": chave(termo), "termo": termo, "descricao": descricao or f"Ilustração de {termo.lower()}."}


def alternativas(resposta, distratores, indice):
    opcoes = list(dict.fromkeys([resposta, *distratores]))
    giro = indice % len(opcoes)
    return opcoes[giro:] + opcoes[:giro]


def embaralhar(sequencia, semente):
    """Ordem determinística que não é a original nem uma rotação dela (rotação vira padrão fácil de decorar)."""
    gerador = random.Random(f"prosa:{semente}")
    rotacoes = [sequencia[i:] + sequencia[:i] for i in range(len(sequencia))]
    for _ in range(100):
        candidata = list(sequencia)
        gerador.shuffle(candidata)
        if candidata not in rotacoes:
            return candidata
    raise ValueError(f"Não há ordem sem rotação para {sequencia}.")


def itens():
    def item(modelo, alvo, formato, enunciado, resposta, **dados):
        return (f"{modelo}-{chave(alvo)}", modelo, formato, enunciado, dados, resposta)

    for i, (letra, dupla) in enumerate(zip(ascii_uppercase, PALAVRAS_POR_LETRA, strict=True)):
        vogal = letra in "AEIOU"
        # Distratores do mesmo grupo: numa questão de consoante, uma vogal entre as opções seria eliminada de cara.
        outras = [l for l in ascii_uppercase if (l in "AEIOU") == vogal and l != letra]
        opcoes = alternativas(letra, (outras[i % len(outras)], outras[(i + 1) % len(outras)]), i)
        palavras = dupla.split()
        lacunas = [{"imagem": imagem(p), "lacuna": "_" + p[1:]} for p in palavras]
        for palavra, lacuna in zip(palavras, lacunas, strict=True):
            grupo = "vogal" if vogal else "consoante"
            yield item("1A", palavra, "escolha", f"Selecione a {grupo} inicial do nome do desenho.",
                       letra, grupo=grupo, opcoes=opcoes, **lacuna)
            yield item("3A", palavra, "escolha", "Selecione a letra inicial do nome do desenho.",
                       letra, opcoes=opcoes, **lacuna)
            yield item("1D", palavra, "digitar_campos", "Leia a palavra e escreva a primeira e a última letra.",
                       [palavra[0], palavra[-1]], palavra=palavra, imagem=imagem(palavra),
                       campos=["inicial", "final"])
        yield item("3E", letra, "digitar_campos", f"Complete as palavras com a letra {letra}.",
                   [letra] * len(lacunas), linhas=lacunas)
        if 0 < i < len(ascii_uppercase) - 1:
            yield item("1C", letra, "digitar_campos", "Escreva as letras que vêm antes e depois.",
                       [ascii_uppercase[i - 1], ascii_uppercase[i + 1]], letra=letra,
                       campos=["anterior", "posterior"])
        opcoes_audio = ["A", "E", "M", "O", "P"] if letra == "A" else alternativas(
            letra, [ascii_uppercase[(i + salto) % 26] for salto in (1, 3, 6, 10)], i
        )
        yield item("1E", letra, "escolha", "Toque para ouvir e selecione a letra que escutar.",
                   letra, audio=letra, opcoes=opcoes_audio)

    grupos_letras = (
        "RELÓGIO SAPATO BOLSA ÓCULOS", "ABELHA IGREJA ESCADA UVA", "MARTELO PONTE DADO NAVIO",
        "LARANJA TOMATE COPO FOCA", "GATO VACA JARRA ZEBRA",
    )
    for i, grupo in enumerate(grupos_letras):
        palavras = grupo.split()
        letras = [chave(p)[0].upper() for p in palavras]
        opcoes = ["B", "O", "R", "S"] if i == 0 else alternativas(letras[0], letras[1:], i)
        yield item("1B", palavras[0], "ligar_pares", "Ligue cada objeto à letra inicial do seu nome.",
                   dict(zip(map(chave, palavras), letras)), imagens=[imagem(p) for p in palavras],
                   opcoes=opcoes)

    partes = {"".join(s.split()): s.split() for s in SILABAS_POR_PALAVRA}
    for i, grupo in enumerate(("CASA DADO BOLO", "MESA NAVIO PANELA", "TAPETE JANELA COPO", "UVA TOMATE MAÇÃ")):
        palavras = grupo.split()
        iniciais = [partes[p][0] for p in palavras]
        opcoes = ["DA", "CA", "BO"] if i == 0 else alternativas(iniciais[0], iniciais[1:], 1)
        yield item("2A", palavras[0], "preencher_com_opcoes", "Complete as palavras com as sílabas abaixo.",
                   iniciais, opcoes=opcoes, linhas=[
                       {"imagem": imagem(p), "lacuna": "_" + "".join(partes[p][1:])} for p in palavras
                   ])
    iniciais = list(dict.fromkeys(s[0] for s in partes.values()))
    for i, (palavra, silabas) in enumerate(partes.items()):
        for posicao, indice in (("inicial", 0), ("final", -1)):
            lacuna = silabas.copy()
            lacuna[indice] = "___"
            yield item("2B", f"{palavra}-{posicao}", "digitar_campos", f"Complete com a sílaba {posicao}.",
                       [silabas[indice]], imagem=imagem(palavra), lacuna=" ".join(lacuna))
        opcoes = ["VI", "VA", "PE", "NA", "RA"] if palavra == "NAVIO" else alternativas(
            silabas[0], [s for s in iniciais[i:] + iniciais[:i] if s != silabas[0]][:4], i
        )
        yield item("2C", palavra, "escolha", "Selecione a sílaba inicial do nome do desenho.",
                   silabas[0], imagem=imagem(palavra), opcoes=opcoes)
        yield item("2D", palavra, "digitar_campos", "Separe a palavra em sílabas.",
                   silabas, palavra=palavra, quantidade_campos=len(silabas))
        yield item("2E", palavra, "digitar_campos", "Escreva a palavra formada por estas sílabas.",
                   [palavra], silabas=silabas)

    for consoante in "BDFJLMNPRSTVZCG":
        familia = [consoante + v for v in ("AOU" if consoante in "CG" else "AEIOU")]
        for i, silaba in enumerate(familia):
            opcoes = ["BA", "NE", "MA", "PU"] if silaba == "MA" else alternativas(
                silaba, [s for s in familia if s != silaba][:3], i
            )
            yield item("2F", silaba, "escolha", "Toque para ouvir e selecione a sílaba que escutar.",
                       silaba, audio=silaba, opcoes=opcoes)

    grupos_palavras = (
        "ESCADA BATEDEIRA COPO SOL", "CASA JANELA PORTA MESA", "MARTELO PONTE NAVIO GARRAFA",
        "LARANJA PERA MAÇÃ UVA", "VACA GATO FOCA RATO",
    )
    for grupo in grupos_palavras:
        palavras = grupo.split()
        yield item("3B", palavras[0], "ligar_pares", "Ligue cada imagem à palavra correspondente.",
                   dict(zip(map(chave, palavras), palavras)), imagens=[imagem(p) for p in embaralhar(palavras, grupo)],
                   opcoes=palavras)
    for i, grupo in enumerate(("FOLHA CHAMA FOCA", "UVA PERA MAÇÃ", "COPO MESA PRATO", "NAVIO PONTE CARRO",
                               "BOLSA BOLA BOLO", "DADO DENTE DEDO", "SAPATO CASACO MEIA")):
        palavra, *distratores = grupo.split()
        opcoes = alternativas(palavra, distratores, i)
        yield item("3C", palavra, "escolha_imagem", "Selecione o desenho que corresponde à palavra.",
                   chave(palavra), palavra=palavra, imagens=[imagem(p) for p in opcoes])
    for i, grupo in enumerate(("MAÇÃ BANANA MÃOS MEIA PERA", "BOLSA BOLA BOLO BOTÃO", "CASA CAMA CAPA CALA",
                               "FOLHA FOCA FACA FALA", "MESA MEIA MALA MOLA", "PONTE PORTA PONTA POSTE",
                               "NAVIO NUVEM NINHO NOME", "URSO UVA UNHA URNA")):
        palavra, *distratores = grupo.split()
        opcoes = ["BANANA", "MÃOS", "MEIA", "MAÇÃ", "PERA"] if i == 0 else alternativas(palavra, distratores, i)
        yield item("3D", palavra, "escolha", "Selecione a palavra que corresponde ao desenho.",
                   palavra, imagem=imagem(palavra), opcoes=opcoes)

    for i, (texto, termo, descricao) in enumerate(CENAS):
        palavras = texto.split()
        yield item("4A", texto, "ordenar", "Monte a frase usando o nome da figura.",
                   palavras, frase_com_lacuna=texto.replace(termo, "___", 1),
                   imagem=imagem(termo, descricao), pecas=embaralhar(palavras, texto))
        distratores, destaque = DISTRATORES_CENA[texto]
        yield item("4B", texto, "escolha", "Observe a ilustração e selecione a frase correspondente.",
                   texto, imagem=imagem(texto, f"Cena a ilustrar. {texto.capitalize()}. {destaque}"),
                   opcoes=alternativas(texto, distratores, i))


def sql_texto(valor):
    return "'" + valor.replace("'", "''") + "'"


def inserir(tabela, colunas, linhas, chave_conflito=None, atualizar=(), so_rascunho=False):
    """INSERT idempotente. Com `atualizar`, a recarga aplica a curadoria nova; `so_rascunho` preserva o que foi revisado."""
    valores = ",\n".join(
        "    (" + ", ".join(
            sql_texto(campo) if isinstance(campo, str)
            else "NULL" if campo is None
            else sql_texto(json.dumps(campo, ensure_ascii=False)) + "::jsonb"
            for campo in linha
        ) + ")"
        for linha in linhas
    )
    conflito = "ON CONFLICT DO NOTHING"
    if atualizar:
        conflito = f"ON CONFLICT ({chave_conflito}) DO UPDATE SET " + ", ".join(f"{coluna} = EXCLUDED.{coluna}" for coluna in atualizar)
        if so_rascunho:
            conflito += f"\nWHERE banco_questoes.{tabela}.status = 'rascunho'"
    return f"INSERT INTO banco_questoes.{tabela} ({colunas}) VALUES\n{valores}\n{conflito};\n"


AVISO_PENDENTES = """DO $$
DECLARE
    total integer;
    lista text;
BEGIN
    SELECT count(*), string_agg(id, ', ' ORDER BY id) INTO total, lista FROM banco_questoes.variacoes_pendentes;
    IF total > 0 THEN
        RAISE NOTICE '% variações não montadas (veja banco_questoes.variacoes_pendentes): %', total, lista;
    END IF;
END $$;
"""


def quiz_sql():
    """quiz_nivelamento.sql gerado de contracts/placement-quiz.json: itens, nível de cada item e a mesma correção do app."""
    contrato = json.loads((RAIZ / "contracts" / "placement-quiz.json").read_text(encoding="utf-8"))
    fases = {fase["phase"]: fase["letters"] for fase in json.loads((RAIZ / "contracts" / "pedagogy.json").read_text(encoding="utf-8"))["phases"]}
    regras, nivel = contrato["scoring"], contrato["start_level"]
    corte, minimo_faceis = regras["band_threshold"], regras["min_easy_answered"]
    linhas = []
    for item in contrato["items"]:
        alternativas_sql = ", ".join(sql_texto(opcao["label"]) for opcao in item["options"])
        estimulo = dict(item["stimulus"])
        if any("image" in opcao for opcao in item["options"]):
            estimulo["imagens_das_alternativas"] = [opcao.get("image") for opcao in item["options"]]
        linhas.append(f"    ({sql_texto(item['id'])}, {item['order']}, {sql_texto(item['band'])}, {item['level']}, {sql_texto(item['skill'])},\n"
                      f"     {sql_texto(item['instruction'])},\n     {sql_texto(json.dumps(estimulo, ensure_ascii=False))},\n"
                      f"     ARRAY[{alternativas_sql}], {item['answer']})")
    tetos = " ".join(f"WHEN {sql_texto(faixa)} THEN {teto}" for faixa, teto in nivel["cap_by_difficulty"].items())
    minimos = " ".join(f"WHEN {nivel_} THEN {minimo}" for nivel_, minimo in nivel["min_hits_by_level"].items())
    creditos = " ".join(f"WHEN {nivel_} THEN {sql_texto(''.join(fases[fase] for fase in lista))}"
                        for nivel_, lista in contrato["credit"]["phases_by_start_level"].items())
    return f"""-- Gerado por gerar_banco.py a partir de contracts/placement-quiz.json ({contrato['id']}). Não edite à mão:
-- altere o contrato e rode `python bancoquestoesequiz/gerar_banco.py --atualizar-quiz`.
CREATE SCHEMA IF NOT EXISTS banco_questoes;

CREATE TABLE IF NOT EXISTS banco_questoes.quiz_itens (
    id text PRIMARY KEY,
    ordem smallint NOT NULL UNIQUE CHECK (ordem > 0),
    faixa text NOT NULL CHECK (faixa IN ('facil', 'medio', 'dificil')),
    habilidade text NOT NULL,
    enunciado text NOT NULL,
    estimulo jsonb NOT NULL CHECK (jsonb_typeof(estimulo) = 'object'),
    alternativas text[] NOT NULL CHECK (cardinality(alternativas) = 3 AND array_position(alternativas, NULL) IS NULL),
    gabarito smallint NOT NULL CHECK (gabarito BETWEEN 1 AND 3)
);
-- Nível do Prosa que o item mede (1 Letras, 2 Sílabas, 3 Palavras, 4 Frases); bancos antigos ganham a coluna aqui.
ALTER TABLE banco_questoes.quiz_itens ADD COLUMN IF NOT EXISTS nivel smallint CHECK (nivel BETWEEN 1 AND 4);

INSERT INTO banco_questoes.quiz_itens
    (id, ordem, faixa, nivel, habilidade, enunciado, estimulo, alternativas, gabarito)
VALUES
{(","+chr(10)).join(linhas)}
ON CONFLICT (id) DO UPDATE SET ordem = EXCLUDED.ordem, faixa = EXCLUDED.faixa, nivel = EXCLUDED.nivel,
    habilidade = EXCLUDED.habilidade, enunciado = EXCLUDED.enunciado, estimulo = EXCLUDED.estimulo,
    alternativas = EXCLUDED.alternativas, gabarito = EXCLUDED.gabarito;

CREATE OR REPLACE VIEW banco_questoes.quiz_apresentacao AS
SELECT id, ordem, faixa, habilidade, enunciado, estimulo, alternativas, nivel
FROM banco_questoes.quiz_itens;

-- Cada resposta é o índice original (1 a 3). null significa que a pessoa pulou.
-- Um ID ausente indica uma questão que ainda não foi respondida nem pulada.
-- `pulado` = a pessoa pulou o quiz inteiro. A regra é a mesma do app e da API (contracts/placement-quiz.json).
DROP FUNCTION IF EXISTS banco_questoes.corrigir_quiz(jsonb);
DROP FUNCTION IF EXISTS banco_questoes.corrigir_quiz(jsonb, boolean);
CREATE FUNCTION banco_questoes.corrigir_quiz(respostas jsonb, pulado boolean DEFAULT false)
RETURNS TABLE (
    acertos_faceis integer,
    acertos_medios integer,
    acertos_dificeis integer,
    dificuldade text,
    provisoria boolean,
    motivo_provisorio text,
    nivel_inicial smallint,
    letras_creditadas text
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    faceis_respondidas integer;
    faltando integer;
    acertos_nivel integer;
BEGIN
    IF jsonb_typeof(respostas) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Informe um objeto JSON com os IDs e índices das respostas.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_each(respostas) AS r(id, escolha)
        LEFT JOIN banco_questoes.quiz_itens AS q ON q.id = r.id
        WHERE q.id IS NULL OR NOT (r.escolha = 'null'::jsonb OR (jsonb_typeof(r.escolha) = 'number'
            AND r.escolha::text ~ '^[0-9]+$' AND (r.escolha::text)::integer BETWEEN 1 AND cardinality(q.alternativas)))
    ) THEN
        RAISE EXCEPTION 'Use IDs do quiz e os índices 1, 2, 3 ou null.';
    END IF;

    SELECT count(*) FILTER (WHERE q.faixa = 'facil' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'medio' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'dificil' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'facil' AND respostas->q.id <> 'null'::jsonb),
           count(*) FILTER (WHERE NOT respostas ? q.id)
    INTO acertos_faceis, acertos_medios, acertos_dificeis, faceis_respondidas, faltando
    FROM banco_questoes.quiz_itens AS q;

    motivo_provisorio := CASE
        WHEN pulado THEN 'quiz_pulado'
        WHEN faltando > 0 THEN 'quiz_incompleto'
        WHEN faceis_respondidas < {minimo_faceis} THEN 'poucas_respostas_faceis'
        WHEN acertos_faceis < {corte} AND greatest(acertos_medios, acertos_dificeis) >= {corte} THEN 'resultado_contrastante'
    END;
    provisoria := motivo_provisorio IS NOT NULL;
    dificuldade := CASE
        WHEN provisoria OR acertos_faceis < {corte} THEN 'facil'
        WHEN acertos_medios >= {corte} AND acertos_dificeis >= {corte} THEN 'dificil'
        ELSE 'medio'
    END;

    nivel_inicial := 1;
    IF NOT provisoria THEN
        FOR nivel_avaliado IN 1..(CASE dificuldade {tetos} END) LOOP
            SELECT count(*) INTO acertos_nivel FROM banco_questoes.quiz_itens AS q
            WHERE q.nivel = nivel_avaliado AND respostas->q.id = to_jsonb(q.gabarito);
            EXIT WHEN acertos_nivel < (CASE nivel_avaliado {minimos} END);
            nivel_inicial := nivel_avaliado;
        END LOOP;
    END IF;
    letras_creditadas := CASE WHEN provisoria THEN '' ELSE (CASE nivel_inicial {creditos} END) END;
    RETURN NEXT;
END;
$$;
"""


def termos_fixos(modelo, dados):
    termos = set()
    if modelo != "4B":
        termos.update(img["termo"] for img in dados.get("imagens", []))
        if "imagem" in dados:
            termos.add(dados["imagem"]["termo"])
        termos.update(linha["imagem"]["termo"] for linha in dados.get("linhas", []))
    if modelo in {"3B", "3D"}:
        termos.update(dados["opcoes"])
    return termos


def parametros_variacao(modelo, dados, resposta):
    termo = None
    parametros = {}
    if modelo in {"1A", "1D", "2B", "3A"}:
        termo = dados["imagem"]["termo"]
        parametros["imagem"] = dados["imagem"]
    elif modelo == "2D":
        termo = dados["palavra"]
    elif modelo == "2E":
        termo = resposta[0]
    if modelo in {"1A", "3A", "1E", "2F"}:
        parametros["opcoes"] = dados["opcoes"]
    if modelo == "1A":
        parametros["grupo"] = dados["grupo"]
    if modelo == "1C":
        parametros["alvo"] = dados["letra"]
    if modelo in {"1E", "2F"}:
        parametros["alvo"] = dados["audio"]
    if modelo == "2B":
        parametros["posicao"] = "inicial" if dados["lacuna"].startswith("___") else "final"
    return termo, parametros


def gerar_sql(base_tratada=None):
    linhas = list(itens())
    if len({linha[0] for linha in linhas}) != len(linhas):
        raise ValueError("Há identificadores de questões duplicados.")
    modelos = {}
    variacoes, fixas, referencias = [], [], []
    vocabulario = set()
    for id_, modelo, formato, enunciado, dados, resposta in linhas:
        regra, molde = DINAMICOS.get(modelo, ("fixa", None))
        modelos[modelo] = (modelo, formato, regra, molde)
        if modelo in DINAMICOS:
            termo, parametros = parametros_variacao(modelo, dados, resposta)
            if termo:
                vocabulario.add(termo)
            variacoes.append((id_, modelo, termo, parametros))
        else:
            fixas.append((id_, modelo, formato, enunciado, dados, json.dumps(resposta, ensure_ascii=False)))
            termos = termos_fixos(modelo, dados)
            vocabulario.update(termos)
            referencias.extend((id_, termo) for termo in sorted(termos))
    esquema = Path(__file__).with_name("esquema.sql").read_text(encoding="utf-8")
    vincular = Path(__file__).with_name("vincular_vocabulario.sql").read_text(encoding="utf-8")
    quiz = quiz_sql()
    palavras_sql = ""
    if base_tratada is not None:
        from importar_base_tratada import carga_palavras

        palavras_sql = carga_palavras(base_tratada, SILABAS_POR_PALAVRA, sql_texto)
    return "".join((
        "BEGIN;\nSET LOCAL client_encoding = 'UTF8';\nSET LOCAL standard_conforming_strings = on;\n",
        palavras_sql,
        esquema,
        inserir("modelos", "id, formato, regra, enunciado", modelos.values(), "id", ("formato", "regra", "enunciado")),
        inserir("vocabulario", "termo", ((termo,) for termo in sorted(vocabulario))),
        inserir("variacoes", "id, modelo, termo, parametros", variacoes, "id", ("modelo", "termo", "parametros"), so_rascunho=True),
        inserir("questoes_fixas", "id, modelo, formato, enunciado, dados, gabarito", fixas, "id",
                ("modelo", "formato", "enunciado", "dados", "gabarito"), so_rascunho=True),
        inserir("questao_vocabulario", "questao_id, termo", referencias),
        """DO $$
BEGIN
    IF to_regclass('banco_questoes.questoes') IS NOT NULL THEN
        UPDATE banco_questoes.questoes_fixas AS fixa
        SET enunciado = antiga.enunciado, dados = antiga.dados,
            gabarito = antiga.gabarito, status = antiga.status
        FROM banco_questoes.questoes AS antiga
        WHERE fixa.id = antiga.id AND fixa.status = 'rascunho'
          AND antiga.status IN ('aprovada', 'arquivada');
    END IF;
END $$;
""",
        vincular,
        quiz,
        AVISO_PENDENTES,
        "\nCOMMIT;\n",
    ))


if __name__ == "__main__":
    from importar_base_tratada import PLANILHA_PADRAO

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("saida", type=Path, nargs="?", help="Caminho do arquivo SQL a gerar.")
    parser.add_argument("--base-tratada", nargs="?", type=Path, const=PLANILHA_PADRAO,
                        help="Inclui a planilha tratada do repositório ou o arquivo informado.")
    parser.add_argument("--atualizar-quiz", action="store_true",
                        help="Regrava quiz_nivelamento.sql a partir de contracts/placement-quiz.json.")
    args = parser.parse_args()
    if not args.saida and not args.atualizar_quiz:
        parser.error("informe o arquivo SQL de saída ou --atualizar-quiz")
    try:
        if args.atualizar_quiz:
            Path(__file__).with_name("quiz_nivelamento.sql").write_text(quiz_sql(), encoding="utf-8")
        if args.saida:
            args.saida.write_text(gerar_sql(args.base_tratada), encoding="utf-8")
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
