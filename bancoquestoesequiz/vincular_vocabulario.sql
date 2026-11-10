-- A base do Prosa armazena os termos em maiúsculas, com acentos.
-- Vínculos selecionados na revisão são preservados.
UPDATE banco_questoes.vocabulario AS v
SET palavra_id = w.id
FROM public.words AS w
WHERE v.palavra_id IS NULL AND w.text = v.termo;
