# Quiz inicial de nivelamento do Prosa

**Objetivo.** Escolher qual dificuldade deve predominar na prática inicial. O quiz é pensado para adultos em alfabetização e pode ser usado por pessoas de outras idades que estejam aprendendo a ler e escrever.

**Mensagem de abertura, com opção de ouvir.** “Vamos fazer algumas atividades para escolher por onde começar. Faça no seu ritmo. Se quiser, você pode pular uma questão.”

## Aplicação

1. Mostre uma demonstração sem pontuação. Diga “Toque no círculo” e exiba um círculo e um quadrado. Mostre como selecionar e confirmar.
2. Apresente uma questão por tela, em ordem de faixa, com quatro questões fáceis, quatro médias e quatro difíceis. Use toque, opção de repetir a instrução e botão **Pular**. Deixe o participante responder no próprio ritmo.
3. Registre a primeira resposta confirmada ou o estado **pulada**. Mostre o resultado ao final. Nas questões de leitura, mantenha o texto avaliado na tela e separe-o do áudio da instrução.

A versão executável desta proposta está em [`contracts/placement-quiz.json`](../contracts/placement-quiz.json), usada pelo app, pela API e pela carga PostgreSQL. Mudanças nos itens ou na regra devem ser feitas nos dois lugares; os testes conferem o contrato. Os IDs abaixo identificam itens fixos do quiz. A dificuldade é uma proposta de curadoria para o item inteiro. As classificações de palavras do ML continuam com as categorias fácil, médio e difícil.

## Questões

As opções estão na ordem proposta para a primeira versão. A coluna **Gabarito** é para correção. As descrições de imagens orientam a produção da mídia.

| ID | Faixa | Habilidade | Instrução | O que aparece ou toca | Opções em ordem | Gabarito |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Fácil | Reconhecer vogal pelo nome | Ouça e toque na letra que você ouviu. | Áudio do item “a”, falado isoladamente. | O · A · E | A |
| F2 | Fácil | Reconhecer consoante pelo nome | Ouça e toque na letra que você ouviu. | Áudio do item “eme”, falado isoladamente. | M · N · P | M |
| F3 | Fácil | Completar sílaba inicial | Olhe a imagem e toque na sílaba que falta. | Desenho de uma casa e texto `___ SA`. | PA · MA · CA | CA |
| F4 | Fácil | Ler uma palavra de duas sílabas | Leia a palavra e toque na imagem que combina. | Palavra `COPO` e três imagens de objetos, sem nomes escritos. | Prato · Copo · Colher | Imagem do copo |
| M1 | Média | Completar sílaba interna | Olhe a imagem e toque na sílaba que falta. | Desenho de uma panela de cozinha e texto `PA ___ LA`. | NA · ME · NE | NE |
| M2 | Média | Identificar sílaba final | Olhe a imagem e toque na sílaba que falta. | Desenho de um tapete e texto `TA PE ___`. | TE · TA · TO | TE |
| M3 | Média | Ler e distinguir palavras parecidas | Olhe a imagem e toque na palavra que combina. | Desenho de um sapato fechado. | SACOLA · SAPATO · SABÃO | SAPATO |
| M4 | Média | Entender uma frase curta | Leia a frase e toque na imagem que combina. | `O COPO ESTÁ NA MESA.` Três cenas com os mesmos objetos. | Copo debaixo da mesa · Copo no chão, ao lado da mesa · Copo em cima da mesa | Copo em cima da mesa |
| D1 | Difícil | Completar sílaba com encontro consonantal | Olhe a imagem e toque na sílaba que falta. | Desenho de um prato vazio e texto `___ TO`. | PRA · BRA · TRA | PRA |
| D2 | Difícil | Distinguir ações em frases parecidas | Olhe a cena e toque na frase que descreve o que acontece. | Pessoa colocando um prendedor em uma camiseta no varal, ao lado de outras roupas penduradas. | A PESSOA DOBRA A ROUPA. · A PESSOA ESTENDE A ROUPA. · A PESSOA LAVA A ROUPA. | A PESSOA ESTENDE A ROUPA. |
| D3 | Difícil | Encontrar uma informação em um aviso | Leia o aviso. Em qual dia a feira vai abrir? | `A FEIRA ABRE NO SÁBADO. NO DOMINGO, A FEIRA FICA FECHADA.` | DOMINGO · SEGUNDA-FEIRA · SÁBADO | SÁBADO |
| D4 | Difícil | Relacionar duas frases para entender uma ação | Leia o texto. Por que Rui pegou o guarda-chuva? | `RUI VIU QUE ESTAVA CHOVENDO. ANTES DE SAIR, PEGOU O GUARDA-CHUVA.` | PORQUE ESTAVA CHOVENDO. · PORQUE IA COMPRAR UM GUARDA-CHUVA. · PORQUE ESTAVA FAZENDO SOL. | PORQUE ESTAVA CHOVENDO. |

## Regra inicial para recomendar a dificuldade

Conte os acertos separadamente por faixa. Cada questão correta vale um acerto. Uma questão pulada fica registrada à parte e não soma acerto. Uma faixa é atingida com **pelo menos três acertos entre suas quatro questões**.

| Resultado | Dificuldade predominante | Mistura inicial sugerida |
| --- | --- | --- |
| Faixa fácil abaixo de três acertos | Fácil | Em cada 10 exercícios elegíveis, 6 fáceis, 3 médios e 1 difícil. |
| Faixa fácil atingida, com a média ou a difícil abaixo de três acertos | Média | Em cada 10 exercícios elegíveis, 3 fáceis, 5 médios e 2 difíceis. |
| As três faixas atingidas | Difícil | Em cada 10 exercícios elegíveis, 2 fáceis, 3 médios e 5 difíceis. |

As proporções são metas para sessões seguintes e dependem dos exercícios disponíveis e já liberados para a pessoa.

Se o quiz for pulado, interrompido ou tiver menos de três respostas confirmadas na faixa fácil, use **fácil provisório**. Registre separadamente que faltou evidência. Se os acertos nas faixas mais altas contrastarem com um resultado baixo na faixa fácil, comece com fácil provisório e reveja a recomendação com as primeiras respostas de prática.

**Mensagem ao terminar.** “Vamos começar com atividades no seu ritmo. Conforme você pratica, vamos ajustando as próximas.”

## Nível de partida e crédito na trilha

Além da dificuldade, o resultado indica por qual nível do Prosa começar. Cada item mede um nível:

- **Letras:** F1 e F2.
- **Sílabas:** F3, M1, M2 e D1.
- **Palavras:** F4 e M3.
- **Frases:** M4, D2, D3 e D4.

O nível de partida é o maior nível em que ele e todos os anteriores atingem o mínimo de acertos: 2 em Letras, 3 em Sílabas, 2 em Palavras e 3 em Frases. Há um teto pela dificuldade: fácil começa em Letras, médio vai no máximo até Palavras e difícil pode chegar a Frases.

Quando o nível é Sílabas ou acima, as letras das fases 1 e 2 contam como já apresentadas para abrir as unidades das trilhas. Em Frases, as três fases contam. Nenhuma lição é marcada como concluída: as letras continuam disponíveis para revisão. Resultado provisório nunca dá crédito.

## Entrega para a equipe

- **Conteúdo.** Usar os IDs, alternativas e gabaritos acima. Gravar os dois áudios dos itens de letras, narrar as instruções e preparar as ilustrações. Conferir no piloto se as imagens comunicam as ações e posições previstas.
- **Aplicativo e backend.** Registrar ID, resposta confirmada ou pulada e acerto por faixa. Salvar a dificuldade recomendada e o estado provisório, quando aplicável. Usar a recomendação para priorizar a prática entre os itens elegíveis.
- **Revisão pedagógica.** Testar as instruções, os distratores e a regra de três acertos com o público do Prosa antes de fixar os cortes. As faixas e proporções acima são decisões iniciais para o piloto.
