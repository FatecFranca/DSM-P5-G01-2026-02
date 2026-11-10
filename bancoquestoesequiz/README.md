# Banco de questões do Prosa

O [quiz inicial de nivelamento](QUIZ_NIVELAMENTO.md) reúne os itens, gabaritos e a regra proposta para recomendar a dificuldade da prática. A carga deste banco também instala as 12 questões do quiz e sua função de correção.

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

A carga executa em uma transação. Ela importa o vocabulário, instala as questões e o quiz e resolve os vínculos. Pode ser repetida para inserir novos IDs e vincular palavras pendentes. Se a versão antiga foi instalada, `banco_questoes.questoes` fica como histórico, e as questões que continuam fixas aproveitam as versões aprovadas ou arquivadas.

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

A importação usa a coluna `PALAVRA`, preserva acentos e remove duplicatas após normalizar a grafia. A separação silábica vem da curadoria pedagógica e do vocabulário versionado do projeto. A coluna `ESTSILABICA` da planilha contém padrões como `CV`. Quando a separação escrita está ausente, a palavra entra com uma lista vazia e fica fora das variações que precisam desse dado. No banco do projeto, novas palavras entram como candidatas. Os campos obrigatórios de dificuldade recebem o valor inicial `medio`, e a predição do modelo fica vazia. Para palavras já cadastradas, a carga só preenche sílabas ausentes quando há uma separação disponível.

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

As novas questões fixas e configurações entram como rascunho. Imagens têm identificadores editoriais e descrições, e o áudio tem texto de referência. A consulta de montagem é para revisão e testes no banco. Para uso por estudantes, a integração do app ainda precisa selecionar itens aprovados, resolver as mídias do servidor e aplicar as regras de progressão, dificuldade e revisão.

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

O exemplo retorna 4 acertos fáceis, 4 médios, 2 difíceis e recomendação `medio`. A função recebe o índice da alternativa na ordem armazenada, começando em 1. Envie `null` quando a pessoa pular uma questão. Um ID ausente indica quiz incompleto e gera recomendação provisória. A função devolve o resultado da correção para a integração. O registro das respostas por usuário e a seleção da prática ficam com a equipe do app.
