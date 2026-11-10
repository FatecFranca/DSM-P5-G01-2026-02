-- Gerado por gerar_banco.py a partir de contracts/placement-quiz.json (nivelamento-v1). Não edite à mão:
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
    ('F1', 1, 'facil', 1, 'nome_da_vogal',
     'Ouça e toque na letra que você ouviu.',
     '{"audio": "A"}',
     ARRAY['O', 'A', 'E'], 2),
    ('F2', 2, 'facil', 1, 'nome_da_consoante',
     'Ouça e toque na letra que você ouviu.',
     '{"audio": "eme"}',
     ARRAY['M', 'N', 'P'], 1),
    ('F3', 3, 'facil', 2, 'silaba_inicial',
     'Olhe a imagem e toque na sílaba que falta.',
     '{"image": "images/words/casa.svg", "image_alt": "Desenho de uma casa.", "text": "___ SA"}',
     ARRAY['PA', 'MA', 'CA'], 3),
    ('F4', 4, 'facil', 3, 'leitura_de_palavra',
     'Leia a palavra e toque na imagem que combina.',
     '{"text": "COPO", "imagens_das_alternativas": ["images/words/prato.svg", "images/words/copo.svg", "images/quiz/colher.svg"]}',
     ARRAY['Prato', 'Copo', 'Colher'], 2),
    ('M1', 5, 'medio', 2, 'silaba_interna',
     'Olhe a imagem e toque na sílaba que falta.',
     '{"image": "images/words/panela.svg", "image_alt": "Desenho de uma panela de cozinha.", "text": "PA ___ LA"}',
     ARRAY['NA', 'ME', 'NE'], 3),
    ('M2', 6, 'medio', 2, 'silaba_final',
     'Olhe a imagem e toque na sílaba que falta.',
     '{"image": "images/words/tapete.svg", "image_alt": "Desenho de um tapete.", "text": "TA PE ___"}',
     ARRAY['TE', 'TA', 'TO'], 1),
    ('M3', 7, 'medio', 3, 'discriminacao_de_palavras',
     'Olhe a imagem e toque na palavra que combina.',
     '{"image": "images/quiz/sapato.svg", "image_alt": "Desenho de um sapato fechado."}',
     ARRAY['SACOLA', 'SAPATO', 'SABÃO'], 2),
    ('M4', 8, 'medio', 4, 'compreensao_de_frase',
     'Leia a frase e toque na imagem que combina.',
     '{"text": "O COPO ESTÁ NA MESA.", "imagens_das_alternativas": ["images/quiz/copo-debaixo-da-mesa.svg", "images/quiz/copo-no-chao.svg", "images/quiz/copo-em-cima-da-mesa.svg"]}',
     ARRAY['Copo debaixo da mesa', 'Copo no chão, ao lado da mesa', 'Copo em cima da mesa'], 3),
    ('D1', 9, 'dificil', 2, 'encontro_consonantal',
     'Olhe a imagem e toque na sílaba que falta.',
     '{"image": "images/quiz/prato-vazio.svg", "image_alt": "Desenho de um prato vazio.", "text": "___ TO"}',
     ARRAY['PRA', 'BRA', 'TRA'], 1),
    ('D2', 10, 'dificil', 4, 'discriminacao_de_frases',
     'Olhe a cena e toque na frase que descreve o que acontece.',
     '{"image": "images/quiz/varal.svg", "image_alt": "Pessoa colocando um prendedor em uma camiseta no varal, ao lado de outras roupas penduradas."}',
     ARRAY['A PESSOA DOBRA A ROUPA.', 'A PESSOA ESTENDE A ROUPA.', 'A PESSOA LAVA A ROUPA.'], 2),
    ('D3', 11, 'dificil', 4, 'informacao_explicita',
     'Leia o aviso. Em qual dia a feira vai abrir?',
     '{"text": "A FEIRA ABRE NO SÁBADO. NO DOMINGO, A FEIRA FICA FECHADA."}',
     ARRAY['DOMINGO', 'SEGUNDA-FEIRA', 'SÁBADO'], 3),
    ('D4', 12, 'dificil', 4, 'relacao_entre_frases',
     'Leia o texto. Por que Rui pegou o guarda-chuva?',
     '{"text": "RUI VIU QUE ESTAVA CHOVENDO. ANTES DE SAIR, PEGOU O GUARDA-CHUVA."}',
     ARRAY['PORQUE ESTAVA CHOVENDO.', 'PORQUE IA COMPRAR UM GUARDA-CHUVA.', 'PORQUE ESTAVA FAZENDO SOL.'], 1)
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
        WHEN faceis_respondidas < 3 THEN 'poucas_respostas_faceis'
        WHEN acertos_faceis < 3 AND greatest(acertos_medios, acertos_dificeis) >= 3 THEN 'resultado_contrastante'
    END;
    provisoria := motivo_provisorio IS NOT NULL;
    dificuldade := CASE
        WHEN provisoria OR acertos_faceis < 3 THEN 'facil'
        WHEN acertos_medios >= 3 AND acertos_dificeis >= 3 THEN 'dificil'
        ELSE 'medio'
    END;

    nivel_inicial := 1;
    IF NOT provisoria THEN
        FOR nivel_avaliado IN 1..(CASE dificuldade WHEN 'facil' THEN 1 WHEN 'medio' THEN 3 WHEN 'dificil' THEN 4 END) LOOP
            SELECT count(*) INTO acertos_nivel FROM banco_questoes.quiz_itens AS q
            WHERE q.nivel = nivel_avaliado AND respostas->q.id = to_jsonb(q.gabarito);
            EXIT WHEN acertos_nivel < (CASE nivel_avaliado WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 2 WHEN 4 THEN 3 END);
            nivel_inicial := nivel_avaliado;
        END LOOP;
    END IF;
    letras_creditadas := CASE WHEN provisoria THEN '' ELSE (CASE nivel_inicial WHEN 1 THEN '' WHEN 2 THEN 'AEIOUMLPSTRNDCG' WHEN 3 THEN 'AEIOUMLPSTRNDCG' WHEN 4 THEN 'AEIOUMLPSTRNDCGBFVHQJKZXWY' END) END;
    RETURN NEXT;
END;
$$;
