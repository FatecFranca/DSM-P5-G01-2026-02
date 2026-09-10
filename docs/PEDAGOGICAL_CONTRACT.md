# Contrato pedagógico do MVP

## Público e abordagem

O Alfabetiza apoia a alfabetização inicial de jovens e adultos com linguagem respeitosa, direta e não infantilizada. O aplicativo orienta e oferece novas tentativas; ele não substitui avaliação pedagógica nem transforma uma resposta em julgamento sobre a capacidade do estudante.

A revisão de objetivos, sequência, textos e observação dos testes é responsabilidade do integrante capacitado do grupo. A aprovação humana permanece registrada como pendência antes de qualquer pesquisa com participantes.

## Sequência inicial

As 26 letras maiúsculas de forma são apresentadas progressivamente nesta ordem:

`A, E, I, O, U, M, L, P, S, T, R, N, D, C, G, B, F, V, H, Q, J, K, Z, X, W, Y`.

A trilha é dividida em três fases: vogais (`A, E, I, O, U`), consoantes de alta utilidade (`M, L, P, S, T, R, N, D, C, G`) e ampliação do vocabulário (`B, F, V, H, Q, J, K, Z, X, W, Y`). A letra `G` pertence à segunda fase para permitir palavras comuns mais cedo.

A ordem começa pelas vogais e adiciona consoantes úteis para formar as primeiras palavras. Cada lição oferece as atividades de letra:

1. ouvir uma instrução e escolher a letra;
2. reconhecer visualmente a letra solicitada;
3. localizar a letra em uma palavra contextualizada, escolhendo a posição em que ela aparece;
4. quando existe par de palavras válido, escolher em qual palavra a letra entra (`complete_word`).

Regras verificadas automaticamente pelo content-lint da API e pelo validador do app:

- a palavra de contexto de `localizar` e todas as palavras de `completar` usam somente letras já apresentadas;
- em `completar`, exatamente uma opção é completada pela letra da lição; o distrator tem a lacuna em outra letra já aprendida e não contém a letra da lição;
- a posição da resposta em `completar` alterna entre as lições, para não ficar sempre em primeiro.

Exceção registrada em 15 de setembro de 2026: `A` e `E` não têm a atividade de localizar, porque não existe palavra real formada só por `A` ou por `A` e `E`. `I`, `O`, `U`, `M` e `P` tiveram a palavra de contexto trocada (`AI`, `OI`, `EU`, `MEU`, `MAPA`) pelo mesmo motivo, e os pares de `completar` foram definidos na mesma data. Todas essas palavras aguardam revisão pedagógica.

As atividades de palavra são liberadas somente quando todas as letras da palavra já foram apresentadas. O estado de domínio registra tentativas, acertos, acurácia e próxima revisão.

Depois da base de letras e sílabas, o vocabulário será organizado em trilhas de cotidiano. A primeira proposta é `Tem em casa`, seguida por `Família`, `Esporte`, `Trabalho`, `Saúde`, `Transporte`, `Compras` e `Documentos`. Cada trilha deve reunir palavras, frases curtas, imagens e áudio coerentes com o contexto, sem introduzir letras ou padrões ainda não trabalhados.

## Vocabulário contextualizado

| Palavra | Separação em sílabas | Contexto | Dificuldade inicial |
|---|---|---|---|
| CASA | CA-SA | moradia | fácil |
| MESA | ME-SA | objeto cotidiano | fácil |
| MALA | MA-LA | deslocamento | fácil |
| RUA | RU-A | localização | fácil |
| NOME | NO-ME | identidade | fácil |
| DATA | DA-TA | documentos | fácil |
| ÔNIBUS | Ô-NI-BUS | transporte | médio |
| TRABALHO | TRA-BA-LHO | cotidiano adulto | difícil |

As classificações são um bootstrap transparente, não uma afirmação pedagógica definitiva. A equipe poderá revisar a dificuldade somente com evidências de uso e nova revisão pedagógica; a regra do produto continua explícita e auditável.

## Critérios de feedback

- Resposta correta: confirmar a tentativa com mensagem objetiva e contextualizada.
- Resposta incorreta: oferecer nova tentativa, repetir o áudio e mostrar uma explicação curta, sem punição ou linguagem constrangedora.
- O estudante pode repetir o áudio e reiniciar a atividade a qualquer momento.

## Critérios de sucesso

- concluir uma lição sem ajuda técnica;
- conseguir repetir todas as instruções em áudio;
- manter resultado e progresso após fechar e reabrir o aplicativo;
- continuar uma atividade básica sem rede;
- sincronizar cada tentativa uma única vez quando a conexão retornar;
- registrar clareza percebida e evolução entre pré-teste e pós-teste, mediante consentimento.

