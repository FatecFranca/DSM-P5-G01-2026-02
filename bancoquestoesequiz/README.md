# Banco de questões do Prosa

A carga PostgreSQL adapta os 18 modelos do arquivo [EXERCICIOSPARAOAPP.txt](EXERCICIOSPARAOAPP.txt). São **85 questões fixas** e **349 configurações de variação**. A configuração guarda os parâmetros permitidos. A questão e o gabarito são montados ao consultar o banco.

| Nível | Questões fixas | Modelos com variações |
| --- | --- | --- |
| 1 · Letras | 1B, ligar figuras a letras | 1A, 1C, 1D e 1E, escolher a inicial, completar vizinhos, escrever as letras das pontas e reconhecer a letra ouvida |
| 2 · Sílabas | 2A e 2C, lacunas em grupo e escolha com distratores curados | 2B, 2D, 2E e 2F, completar, separar, formar e ouvir |
| 3 · Palavras | 3B a 3E, associações, escolhas ilustradas e sequência de duas palavras por letra | 3A, completar a inicial pela figura |
| 4 · Frases | 4A e 4B, ordenar palavras e escolher a frase da cena | — |

Por exemplo, o modelo 2B define como completar uma sílaba. Uma linha em `variacoes` autoriza SORVETE com a posição inicial e outra autoriza a posição final. Para montar `___ VE TE` com gabarito `SOR`, a consulta usa a lista de sílabas da palavra no banco linguístico. As questões de cena ficam prontas em `questoes_fixas`, com suas próprias alternativas e gabarito.

## Como carregar

Execute na raiz do repositório, com Python 3.11+ e o cliente `psql`. Use o PostgreSQL do Prosa com as migrações da API já aplicadas. Troque o host, usuário e nome do banco pelos da sua instalação.

```powershell
$arquivo = Join-Path $env:TEMP 'prosa-banco-questoes.sql'
python bancoquestoesequiz/gerar_banco.py $arquivo
psql -h localhost -U prosa -d prosa -v ON_ERROR_STOP=1 -f $arquivo
```

A carga cria o esquema `banco_questoes` em uma transação. O usuário precisa poder criá-lo e ler e referenciar `public.words`. A carga pode ser repetida para inserir novos IDs e tentar vincular palavras pendentes. Edições em registros já carregados são preservadas. Se a carga anterior foi executada, sua tabela `banco_questoes.questoes` é preservada como histórico. Questões que continuam fixas aproveitam as versões aprovadas ou arquivadas desse histórico. Revisões antigas dos exercícios convertidos em modelos ficam registradas no histórico para conferência.

## Como a base linguística se conecta

`vocabulario.termo` guarda a grafia solicitada pela curadoria. `vocabulario.palavra_id` referencia `public.words.id` por chave estrangeira. A carga procura a grafia exata, em maiúsculas e com acento. Se a palavra ainda estiver em tratamento ou ausente, o vínculo fica pendente. As variações dependentes dela aparecem na consulta de montagem assim que a palavra estiver vinculada e seus dados forem suficientes para o modelo. O esquema lê a base linguística e guarda os vínculos no banco pedagógico.

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
