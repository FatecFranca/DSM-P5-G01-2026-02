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

INSERT INTO banco_questoes.quiz_itens
    (id, ordem, faixa, habilidade, enunciado, estimulo, alternativas, gabarito)
VALUES
    ('F1', 1, 'facil', 'nome_da_vogal',
     'Ouça e toque na letra que você ouviu.', '{"audio":"a"}',
     ARRAY['O', 'A', 'E'], 2),
    ('F2', 2, 'facil', 'nome_da_consoante',
     'Ouça e toque na letra que você ouviu.', '{"audio":"eme"}',
     ARRAY['M', 'N', 'P'], 1),
    ('F3', 3, 'facil', 'silaba_inicial',
     'Olhe a imagem e toque na sílaba que falta.', '{"imagem":"Casa","texto":"___ SA"}',
     ARRAY['PA', 'MA', 'CA'], 3),
    ('F4', 4, 'facil', 'leitura_de_palavra',
     'Leia a palavra e toque na imagem que combina.', '{"texto":"COPO","alternativas_em_imagem":true}',
     ARRAY['Prato', 'Copo', 'Colher'], 2),
    ('M1', 5, 'medio', 'silaba_interna',
     'Olhe a imagem e toque na sílaba que falta.', '{"imagem":"Panela de cozinha","texto":"PA ___ LA"}',
     ARRAY['NA', 'ME', 'NE'], 3),
    ('M2', 6, 'medio', 'silaba_final',
     'Olhe a imagem e toque na sílaba que falta.', '{"imagem":"Tapete","texto":"TA PE ___"}',
     ARRAY['TE', 'TA', 'TO'], 1),
    ('M3', 7, 'medio', 'discriminacao_de_palavras',
     'Olhe a imagem e toque na palavra que combina.', '{"imagem":"Sapato fechado"}',
     ARRAY['SACOLA', 'SAPATO', 'SABÃO'], 2),
    ('M4', 8, 'medio', 'compreensao_de_frase',
     'Leia a frase e toque na imagem que combina.',
     '{"texto":"O COPO ESTÁ NA MESA.","alternativas_em_imagem":true}',
     ARRAY['Copo debaixo da mesa', 'Copo no chão ao lado da mesa', 'Copo em cima da mesa'], 3),
    ('D1', 9, 'dificil', 'encontro_consonantal',
     'Olhe a imagem e toque na sílaba que falta.', '{"imagem":"Prato vazio","texto":"___ TO"}',
     ARRAY['PRA', 'BRA', 'TRA'], 1),
    ('D2', 10, 'dificil', 'discriminacao_de_frases',
     'Olhe a cena e toque na frase que descreve o que acontece.',
     '{"imagem":"Pessoa colocando um prendedor em uma camiseta no varal, ao lado de outras roupas penduradas"}',
     ARRAY['A PESSOA DOBRA A ROUPA.', 'A PESSOA ESTENDE A ROUPA.', 'A PESSOA LAVA A ROUPA.'], 2),
    ('D3', 11, 'dificil', 'informacao_explicita',
     'Leia o aviso. Em qual dia a feira vai abrir?',
     '{"texto":"A FEIRA ABRE NO SÁBADO. NO DOMINGO, A FEIRA FICA FECHADA."}',
     ARRAY['DOMINGO', 'SEGUNDA-FEIRA', 'SÁBADO'], 3),
    ('D4', 12, 'dificil', 'relacao_entre_frases',
     'Leia o texto. Por que Rui pegou o guarda-chuva?',
     '{"texto":"RUI VIU QUE ESTAVA CHOVENDO. ANTES DE SAIR, PEGOU O GUARDA-CHUVA."}',
     ARRAY['PORQUE ESTAVA CHOVENDO.', 'PORQUE IA COMPRAR UM GUARDA-CHUVA.', 'PORQUE ESTAVA FAZENDO SOL.'], 1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW banco_questoes.quiz_apresentacao AS
SELECT id, ordem, faixa, habilidade, enunciado, estimulo, alternativas
FROM banco_questoes.quiz_itens;

-- Cada resposta é o índice original (1 a 3). null significa que a pessoa pulou.
-- Um ID ausente indica uma questão que ainda não foi respondida nem pulada.
CREATE OR REPLACE FUNCTION banco_questoes.corrigir_quiz(respostas jsonb)
RETURNS TABLE (
    acertos_faceis integer,
    acertos_medios integer,
    acertos_dificeis integer,
    dificuldade text,
    provisoria boolean
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    faceis_respondidas integer;
    total_itens integer;
BEGIN
    IF jsonb_typeof(respostas) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'Informe um objeto JSON com os IDs e índices das respostas.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_each(respostas) AS r(id, escolha)
        LEFT JOIN banco_questoes.quiz_itens AS q ON q.id = r.id
        WHERE q.id IS NULL OR r.escolha NOT IN ('1'::jsonb, '2'::jsonb, '3'::jsonb, 'null'::jsonb)
    ) THEN
        RAISE EXCEPTION 'Use IDs do quiz e os índices 1, 2, 3 ou null.';
    END IF;

    SELECT count(*) FILTER (WHERE q.faixa = 'facil' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'medio' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'dificil' AND respostas->q.id = to_jsonb(q.gabarito)),
           count(*) FILTER (WHERE q.faixa = 'facil' AND respostas->q.id <> 'null'::jsonb),
           count(*)
    INTO acertos_faceis, acertos_medios, acertos_dificeis, faceis_respondidas, total_itens
    FROM banco_questoes.quiz_itens AS q;

    provisoria := (SELECT count(*) FROM jsonb_object_keys(respostas)) < total_itens
        OR faceis_respondidas < 3
        OR (acertos_faceis < 3 AND greatest(acertos_medios, acertos_dificeis) >= 3);
    dificuldade := CASE
        WHEN provisoria OR acertos_faceis < 3 THEN 'facil'
        WHEN acertos_medios >= 3 AND acertos_dificeis >= 3 THEN 'dificil'
        ELSE 'medio'
    END;
    RETURN NEXT;
END;
$$;
