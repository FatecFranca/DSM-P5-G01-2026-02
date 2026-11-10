CREATE SCHEMA IF NOT EXISTS banco_questoes;

CREATE TABLE IF NOT EXISTS banco_questoes.modelos (
    id text PRIMARY KEY CHECK (id ~ '^(1[A-E]|2[A-F]|3[A-E]|4[A-B])$'),
    nivel smallint GENERATED ALWAYS AS (left(id, 1)::smallint) STORED,
    formato text NOT NULL,
    regra text NOT NULL CHECK (regra IN (
        'fixa', 'inicial_imagem', 'vizinhos', 'extremos_palavra', 'escuta',
        'lacuna_silabica', 'separar', 'formar'
    )),
    enunciado text,
    CHECK ((regra = 'fixa') = (enunciado IS NULL))
);

CREATE TABLE IF NOT EXISTS banco_questoes.vocabulario (
    termo text PRIMARY KEY,
    palavra_id varchar(36) REFERENCES public.words(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banco_questoes.variacoes (
    id text PRIMARY KEY,
    modelo text NOT NULL REFERENCES banco_questoes.modelos(id),
    termo text REFERENCES banco_questoes.vocabulario(termo),
    parametros jsonb NOT NULL CHECK (jsonb_typeof(parametros) = 'object'),
    status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovada', 'arquivada'))
);

CREATE TABLE IF NOT EXISTS banco_questoes.questoes_fixas (
    id text PRIMARY KEY,
    modelo text NOT NULL REFERENCES banco_questoes.modelos(id),
    nivel smallint GENERATED ALWAYS AS (left(modelo, 1)::smallint) STORED,
    formato text NOT NULL CHECK (formato IN (
        'escolha', 'escolha_imagem', 'digitar_campos', 'ligar_pares', 'preencher_com_opcoes', 'ordenar'
    )),
    enunciado text NOT NULL CHECK (length(enunciado) > 0),
    dados jsonb NOT NULL CHECK (jsonb_typeof(dados) = 'object'),
    gabarito jsonb NOT NULL,
    status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovada', 'arquivada')),
    CHECK (jsonb_typeof(gabarito) = CASE formato
        WHEN 'escolha' THEN 'string'
        WHEN 'escolha_imagem' THEN 'string'
        WHEN 'ligar_pares' THEN 'object'
        ELSE 'array'
    END)
);

CREATE TABLE IF NOT EXISTS banco_questoes.questao_vocabulario (
    questao_id text REFERENCES banco_questoes.questoes_fixas(id) ON DELETE CASCADE,
    termo text REFERENCES banco_questoes.vocabulario(termo),
    PRIMARY KEY (questao_id, termo)
);

CREATE OR REPLACE VIEW banco_questoes.variacoes_montadas AS
WITH entradas AS (
    SELECT v.id, v.modelo, v.status, v.parametros, m.nivel, m.formato, m.regra, m.enunciado,
           w.id AS palavra_id, upper(w.text) AS palavra,
           CASE WHEN jsonb_typeof(w.syllables::jsonb) = 'array' THEN w.syllables::jsonb END AS silabas,
           v.parametros->>'alvo' AS alvo,
           v.parametros->>'posicao' AS posicao,
           v.parametros->'opcoes' AS opcoes
    FROM banco_questoes.variacoes AS v
    JOIN banco_questoes.modelos AS m ON m.id = v.modelo
    LEFT JOIN banco_questoes.vocabulario AS vocab ON vocab.termo = v.termo
    LEFT JOIN public.words AS w ON w.id = vocab.palavra_id
    WHERE v.status <> 'arquivada'
), montadas AS (
    SELECT *,
           CASE
               WHEN regra = 'inicial_imagem' THEN to_jsonb(left(palavra, 1))
               WHEN regra = 'vizinhos' AND alvo ~ '^[B-Y]$'
                   THEN jsonb_build_array(chr(ascii(alvo) - 1), chr(ascii(alvo) + 1))
               WHEN regra = 'extremos_palavra' AND palavra <> ''
                   THEN jsonb_build_array(left(palavra, 1), right(palavra, 1))
               WHEN regra = 'escuta' THEN to_jsonb(alvo)
               WHEN regra = 'lacuna_silabica' AND posicao IN ('inicial', 'final')
                   THEN jsonb_build_array(silabas->>(CASE WHEN posicao = 'inicial' THEN 0 ELSE -1 END))
               WHEN regra = 'separar' THEN silabas
               WHEN regra = 'formar' THEN jsonb_build_array(palavra)
           END AS resposta
    FROM entradas
)
SELECT id, modelo, nivel, formato, status, palavra_id,
       replace(replace(enunciado, '{grupo}', coalesce(parametros->>'grupo', '')),
               '{posicao}', coalesce(posicao, '')) AS enunciado,
       CASE regra
           WHEN 'inicial_imagem' THEN parametros || jsonb_build_object('lacuna', '_' || substr(palavra, 2))
           WHEN 'vizinhos' THEN jsonb_build_object('letra', alvo, 'campos', ARRAY['anterior', 'posterior'])
           WHEN 'extremos_palavra' THEN parametros || jsonb_build_object(
               'palavra', palavra, 'campos', ARRAY['inicial', 'final'])
           WHEN 'escuta' THEN jsonb_build_object('audio', alvo, 'opcoes', opcoes)
           WHEN 'lacuna_silabica' THEN parametros || jsonb_build_object('lacuna', (
               SELECT string_agg(
                   CASE WHEN ordem = CASE WHEN posicao = 'inicial' THEN 1 ELSE jsonb_array_length(silabas) END
                        THEN '___' ELSE parte END, ' ' ORDER BY ordem)
               FROM jsonb_array_elements_text(silabas) WITH ORDINALITY AS s(parte, ordem)
           ))
           WHEN 'separar' THEN jsonb_build_object('palavra', palavra, 'quantidade_campos', jsonb_array_length(silabas))
           WHEN 'formar' THEN jsonb_build_object('silabas', silabas)
       END AS dados,
       resposta AS gabarito
FROM montadas
WHERE resposta IS NOT NULL
  AND CASE regra
      WHEN 'inicial_imagem' THEN opcoes @> jsonb_build_array(resposta)
      WHEN 'escuta' THEN opcoes @> jsonb_build_array(resposta)
      WHEN 'lacuna_silabica' THEN jsonb_array_length(silabas) > 1
      WHEN 'separar' THEN jsonb_array_length(silabas) > 0
      WHEN 'formar' THEN jsonb_array_length(silabas) > 0
      ELSE true
  END
  AND (regra NOT IN ('lacuna_silabica', 'separar', 'formar') OR palavra = (
      SELECT string_agg(parte, '' ORDER BY ordem)
      FROM jsonb_array_elements_text(silabas) WITH ORDINALITY AS s(parte, ordem)
  ));

-- Variações que a consulta de montagem ainda descarta, com o motivo. A carga avisa quantas são.
CREATE OR REPLACE VIEW banco_questoes.variacoes_pendentes AS
SELECT v.id, v.modelo, v.termo,
       CASE
           WHEN v.termo IS NOT NULL AND vocab.palavra_id IS NULL THEN 'palavra sem vínculo em public.words'
           ELSE 'dados insuficientes para o modelo (sílabas ou opções)'
       END AS motivo
FROM banco_questoes.variacoes AS v
LEFT JOIN banco_questoes.vocabulario AS vocab ON vocab.termo = v.termo
WHERE v.status <> 'arquivada'
  AND NOT EXISTS (SELECT 1 FROM banco_questoes.variacoes_montadas AS m WHERE m.id = v.id);
