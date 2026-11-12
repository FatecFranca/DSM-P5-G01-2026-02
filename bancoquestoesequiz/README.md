# Banco de questões do Prosa

O [quiz inicial de nivelamento](QUIZ_NIVELAMENTO.md) reúne os itens, gabaritos e a regra proposta para recomendar a dificuldade da prática. A fonte única dos itens e da regra é [`contracts/placement-quiz.json`](../contracts/placement-quiz.json): o app aplica o quiz offline, a API recalcula o resultado e esta carga instala as mesmas 12 questões e a mesma função de correção. `quiz_nivelamento.sql` é gerado desse contrato. Para mudar o quiz, altere o contrato e rode `python bancoquestoesequiz/gerar_banco.py --atualizar-quiz`. Os testes falham se algum dos quatro lados divergir.

A carga PostgreSQL adapta os 18 modelos do arquivo [EXERCICIOSPARAOAPP.txt](EXERCICIOSPARAOAPP.txt). São **85 questões fixas** e **349 configurações de variação**. A configuração guarda os parâmetros permitidos. A questão e o gabarito são montados ao consultar o banco.

| Nível | Questões fixas | Modelos com variações |
| --- | --- | --- |
| 1 · Letras | 1B, ligar figuras a letras | 1A, 1C, 1D e 1E, escolher a inicial, completar vizinhos, escrever as letras das pontas e reconhecer a letra ouvida |
| 2 · Sílabas | 2A e 2C, lacunas em grupo e escolha com distratores curados | 2B, 2D, 2E e 2F, completar, separar, formar e ouvir |
| 3 · Palavras | 3B a 3E, associações, escolhas ilustradas e sequência de duas palavras por letra | 3A, completar a inicial pela figura |
| 4 · Frases | 4A e 4B, ordenar palavras e escolher a frase da cena | — |

Por exemplo, o modelo 2B define como completar uma sílaba. Uma linha em `variacoes` autoriza SORVETE com a posição inicial e outra autoriza a posição final. Para montar `___ VE TE` com gabarito `SOR`, a consulta usa a lista de sílabas da palavra no banco linguístico. As questões de cena ficam prontas em `questoes_fixas`, com suas próprias alternativas e gabarito.

## Como carregar a base tratada, as questões e o quiz

**1. Confirme o banco de destino.** Use o PostgreSQL do Prosa com as migrações da API já aplicadas, ou o `prosa_laboratorio` já configurado. No banco da equipe, a conta precisa poder gravar em `public.words`, referenciar essa tabela e criar ou atualizar os objetos do esquema `banco_questoes`.

**2. Gere um único arquivo SQL.** No PowerShell, na raiz do repositório, use Python 3.11+:

```powershell
python -m pip install openpyxl
$arquivo = Join-Path $env:TEMP 'prosa-banco-questoes.sql'
python bancoquestoesequiz/gerar_banco.py $arquivo --base-tratada
$arquivo
```

A opção `--base-tratada` usa a planilha `pre-processamento/Corpus_SANTOS_TONI_FDC_tratado_sem_repeticoes.xlsx`. Para usar outra versão da planilha, passe seu caminho após a opção. Para carregar só as questões e o quiz em um banco que já tem o vocabulário, omita a opção.

**3. Execute a carga.** No pgAdmin, abra a **Query Tool** do banco correto, abra o arquivo SQL pelo ícone de pasta e pressione **F5**. Pelo terminal, use o comando abaixo com o host, porta, usuário e banco da equipe.

```powershell
psql -h SEU_HOST -p 5432 -U SEU_USUARIO -d SEU_BANCO -v ON_ERROR_STOP=1 -f $arquivo
```

Se estiver usando o laboratório, os valores são `127.0.0.1`, `55432`, `prosa` e `prosa_laboratorio`. Se o PostgreSQL estiver no Docker Compose da equipe, copie o SQL gerado para o host que roda o Compose. A partir da pasta `infra` nesse host, substitua `CAMINHO_DO_SQL` pelo caminho do arquivo e execute:

```sh
docker compose cp "CAMINHO_DO_SQL" db:/tmp/prosa-banco-questoes.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/prosa-banco-questoes.sql'
```

A carga executa em uma transação. Ela importa o vocabulário, instala as questões e o quiz e resolve os vínculos. Pode ser repetida: insere novos IDs, vincula palavras pendentes e **atualiza o conteúdo das questões e variações que ainda estão em `rascunho`**. Itens `aprovada` ou `arquivada` nunca são sobrescritos pela recarga. Se a versão antiga foi instalada, `banco_questoes.questoes` fica como histórico, e as questões que continuam fixas aproveitam as versões aprovadas ou arquivadas. Ao final, a carga avisa (NOTICE) quantas variações ainda não montam; a lista com o motivo fica em `banco_questoes.variacoes_pendentes`.

**4. Confira a carga.** Execute no mesmo banco:

```sql
SELECT (SELECT count(*) FROM public.words) AS palavras_no_banco,
       (SELECT count(*) FROM banco_questoes.questoes_fixas) AS fixas,
       (SELECT count(*) FROM banco_questoes.variacoes) AS variacoes,
       (SELECT count(*) FROM banco_questoes.quiz_itens) AS itens_do_quiz;

SELECT count(palavra_id) AS vinculados, count(*) - count(palavra_id) AS pendentes
FROM banco_questoes.vocabulario;
```

Uma carga inicial do catálogo cria 85 questões fixas, 349 configurações de variação e 12 itens de quiz. Os totais de palavras e vínculos também dependem do que já existe no banco.

## Como a base linguística se conecta

`vocabulario.termo` guarda a grafia solicitada pela curadoria. `vocabulario.palavra_id` referencia `public.words.id` por chave estrangeira. A carga procura a grafia exata, em maiúsculas e com acento. Se a palavra ainda estiver em tratamento ou ausente, o vínculo fica pendente. As variações dependentes dela aparecem na consulta de montagem assim que a palavra estiver vinculada e seus dados forem suficientes para o modelo. O esquema lê a base linguística e guarda os vínculos no banco pedagógico.

A importação usa a coluna `PALAVRA`, preserva acentos e remove duplicatas após normalizar a grafia. A separação silábica vem da curadoria pedagógica e do vocabulário versionado do projeto. A coluna `ESTSILABICA` da planilha contém padrões como `CV`. Quando a separação escrita está ausente, a palavra entra com uma lista vazia e fica fora das variações que precisam desse dado. No banco do projeto, novas palavras entram como candidatas. A dificuldade vem da votação dos três modelos treinados com rótulos humanos (LR, LDA e SVM, em `ml/reports/final_corpus_six_model_predictions.csv`). A maioria vence e, em empate, fica `medio`. A predição é gravada em `model_difficulty` com `label_feedback = 'pending'` para revisão (ADR 0005). Palavras sem predição recebem `medio`. Candidatos já cadastrados sem predição a recebem, e palavras curadas não são alteradas. Para palavras já cadastradas, a carga só preenche sílabas ausentes quando há uma separação disponível.

```sql
-- Questões fixas, como a cena da menina no balanço
SELECT id, enunciado, dados, gabarito
FROM banco_questoes.questoes_fixas
WHERE modelo = '4B' AND status <> 'arquivada';

-- Variações montadas na consulta
SELECT id, enunciado, dados, gabarito
FROM banco_questoes.variacoes_montadas
WHERE id IN ('2B-sorvete-inicial', '2B-sorvete-final');

-- Palavras que ainda precisam de vínculo
SELECT termo
FROM banco_questoes.vocabulario
WHERE palavra_id IS NULL
ORDER BY termo;
```

Quando a equipe importar mais palavras em `public.words`, execute novamente a carga ou rode `vincular_vocabulario.sql` no mesmo banco. A tabela `questao_vocabulario` lista as palavras associadas a cada questão fixa, inclusive as que aguardam vínculo.

As novas questões fixas e configurações entram como rascunho. Imagens têm identificadores editoriais e descrições, e o áudio tem texto de referência. A consulta de montagem é para revisão e testes no banco.

### Como as questões chegam ao app

A trilha do app é este banco. `apps/api/app/data/banco_questoes.json` é uma cópia gerada de `itens()` deste gerador (o container da API só leva `apps/api`), e `apps/api/app/question_bank.py` converte cada questão num tipo de `contracts/exercise-types.json`, respondido por toque:

| Modelo | No app |
| --- | --- |
| 1E, 1A, 1D, 1C e 1B | Lição de cada letra (Nível 1). 1E abre a lição; 1D vira tocar a primeira e a última letra; 1C vira escolher a sequência certa (`D E F`); 1B vira uma escolha por objeto, na lição que fecha as letras do grupo. |
| 2F, 2A, 2C | Trilha Sílabas simples: uma unidade por família silábica, completar com sílabas e sílaba do desenho. |
| 2B, 2D, 2E | Trilha Sílabas complexas: escolher a sílaba inicial ou final entre três, montar a separação tocando as sílabas, escolher a palavra formada. |
| 3A, 3B, 3C, 3D, 3E | Trilha Palavras. Ligar (3B) vira uma escolha por imagem; 3C mostra os desenhos como opções; 3E vira escolher, entre palavras ilustradas, a que se completa com a letra. |
| 4A, 4B | Trilha Frases: montar a frase e escolher a frase da cena. |

As figuras são emoji (ou os desenhos embarcados de casa, mesa, copo, prato, porta, panela, cama, sala, tapete e sapato). Para mudar uma questão: edite `gerar_banco.py`, rode `apps/api/.venv/bin/python apps/api/scripts/export_question_bank.py`, depois `apps/api/scripts/export_content_bundle.py` e o seed (`python -m app.seed`) no banco de destino. `apps/api/tests/test_question_bank.py` falha se a cópia divergir do gerador ou se alguma questão não chegar ao app.

Na geração, as questões que antes seguiam um padrão decorável foram corrigidas:

- **Ordenar frase (4A):** as peças são embaralhadas de forma determinística, nunca na ordem certa nem em rotação dela.
- **Ligar imagens (3B):** as imagens também não seguem rotação.
- **Letra inicial (1A e 3A):** os distratores são do mesmo grupo, vogal com vogal e consoante com consoante.
- **Frase da cena (4B):** os distratores são pares mínimos que mudam uma palavra, como `O COPO ESTÁ NO CHÃO` e `O PRATO ESTÁ NA MESA`. A descrição da cena diz o que a ilustração precisa mostrar.

Esses distratores novos aguardam a revisão pedagógica, como os demais rascunhos.

## Testar o quiz de nivelamento

Depois de gerar e importar a carga, abra a Query Tool do banco no pgAdmin. Para instalar só o quiz em um laboratório que já tem o esquema `banco_questoes`, abra o arquivo `quiz_nivelamento.sql` na Query Tool e execute-o.

```sql
SELECT id, enunciado, estimulo, alternativas
FROM banco_questoes.quiz_apresentacao
ORDER BY ordem;

SELECT *
FROM banco_questoes.corrigir_quiz('{
  "F1":2,"F2":1,"F3":3,"F4":2,
  "M1":3,"M2":1,"M3":2,"M4":3,
  "D1":1,"D2":2,"D3":null,"D4":null
}'::jsonb);
```

O exemplo retorna 4 acertos fáceis, 4 médios e 2 difíceis, com recomendação `medio`. O nível inicial é 3 (Palavras), e as letras creditadas são `AEIOUMLPSTRNDCG`.

A função recebe o índice da alternativa na ordem armazenada, começando em 1. Envie `null` quando a pessoa pular uma questão. Um ID ausente indica quiz incompleto e gera recomendação provisória. O segundo parâmetro, `pulado`, marca o quiz inteiro como pulado: `corrigir_quiz('{}', true)`.

`motivo_provisorio` explica um resultado provisório e pode ser `quiz_pulado`, `quiz_incompleto`, `poucas_respostas_faceis` ou `resultado_contrastante`. Os exemplos com resultado esperado ficam em `contracts/placement-quiz.json`.

O app registra as respostas de cada pessoa e a API as guarda em `placement_results` (`GET /v1/placement`). O resultado define o nível de partida, as letras creditadas e a mistura de dificuldade. Ver `docs/adr/0006-nivelamento-inicial.md`.

## Testes

```powershell
python -m pip install pytest openpyxl
python -m pytest bancoquestoesequiz
```

Para incluir o teste de integração com PostgreSQL, aponte `PROSA_TEST_DATABASE_URL` para um banco de testes com as migrações da API aplicadas. O teste carrega o SQL duas vezes e confere a correção do quiz com todos os exemplos do contrato.
