# Roteiro de implementação dos exercícios

> Criado em 15/09/2026. Este documento registra a análise de
> docs/EXERCÍCIOS PARA O APP.txt. O texto original do integrante permanece
> preservado como fonte das propostas; este roteiro separa estado verificado,
> decisões e trabalho pendente.

## Como usar este roteiro

- O código e o bundle publicados são a evidência de uma etapa técnica concluída.
- Uma caixa só pode ser marcada após a mudança, os testes e a revisão do diff.
- A aprovação pedagógica continua registrada no catálogo; teste automatizado não
  substitui a observação com alfabetizandos.
- apps/api/app/content_data.py é a fonte curada. Após cada alteração, gerar
  apps/mobile/assets/content/seed-bundle.json com
  apps/api/scripts/export_content_bundle.py.

## Estado verificado em 15/09/2026

| Área | Já existe | Evidência técnica |
| --- | --- | --- |
| Letras | 26 lições na ordem AEIOUMLPSTRNDCGBFVHQJKZXWY, com sete habilidades por letra | content_data.py, content_types.py, content_lint.py |
| Escuta e escolha | escolha da letra ouvida, reconhecimento visual e som inicial | listen_choose, recognize_letter, initial_sound |
| Leitura de palavra | caça à letra, comparação, lacuna contextual e revisão | find_all_in_word, compare_words, complete_word, mixed_review |
| Sílabas | ouvir/escolher sílaba CV e montar palavras por toque | syllable_listen_choose, word_from_syllables |
| Palavras e frases | ouvir/escolher palavra, completar e ordenar frases por toque | word_listen_choose, sentence_fill_word, sentence_order |
| Fluxo | áudio, nova tentativa, progresso por item, repetição espaçada e uso offline | app mobile, armazenamento e sincronização |
| Piloto | trilha Tem em casa: 9 palavras e 5 frases, pendentes de revisão humana | TRACKS, WORDS, SENTENCES |

O modelo já armazena referência de imagem, rótulo acessível, licença e atribuição
para palavras e frases. O bundle e o mobile ainda não resolvem esses campos como
ilustrações próprias offline.

## Decisões sobre as propostas recebidas

| Proposta | Decisão | Situação |
| --- | --- | --- |
| Escolher vogal/consoante inicial e ouvir letra | Manter nas lições de letras | Implementada |
| Ligar vários objetos às letras | Não incluir no piloto: a decisão individual é mais acessível e mensurável | Não priorizada |
| Letra anterior e posterior | Revisão do alfabeto após apresentar as 26 letras | Futura |
| Letra inicial/final da palavra | Inicial existe; final fica para etapa futura | Parcial |
| Ouvir e escolher sílaba | Manter | Implementada |
| Sílaba inicial ou final da palavra | Novo exercício contextual por toque | Planejada |
| Separar/formar digitando | Usar montagem ordenada por toque, sem teclado | Implementada para montagem |
| Escolher palavra pela imagem | Nova atividade com ilustrações próprias | Planejada |
| Escolher frase pela cena | Nova atividade com ilustrações próprias | Planejada |
| Ordenar palavras para frase | Manter | Implementada |
| Curiosidades após a alfabetização essencial | Avaliar após validar a base atual | Futura |

## Escopo fechado da próxima entrega

### Interação e acessibilidade

- Respostas por toque, com opções grandes, montagem ordenada e ação para limpar.
- Cada ilustração terá rótulo acessível e áudio contextual.
- A montagem não exibirá a palavra-resposta antes da tentativa: a instrução será
  neutra e imagem/áudio fornecerão o contexto.

### Ativos visuais offline

Criar ilustrações próprias, simples e embutidas no aplicativo para CASA, MESA,
CAMA, SALA, COPO, PRATO, PORTA, PANELA e TAPETE, além de cinco cenas das frases
existentes da trilha.

Cada ativo terá ID estável, caminho local, texto alternativo, licença
Projeto Prosa e autoria do projeto. Um manifesto estático do mobile
resolverá o ID para um arquivo local. Bundle que referenciar ativo ausente será
rejeitado, preservando o conteúdo anterior.

### Novos contratos de exercício

| Tipo | Alvo | Renderizador | Regra obrigatória |
| --- | --- | --- | --- |
| syllable_position_choose | sílaba | choice | payload com word, syllables, position (initial/final) e ativo; a resposta é a primeira ou última sílaba catalogada |
| word_image_choose | palavra | choice | ativo/rótulo da palavra-alvo e três opções de palavras curadas, uma correta |
| sentence_image_choose | frase | choice | ativo/rótulo da cena e três frases curadas, uma correta |

Os tipos serão declarados em contracts/exercise-types.json e espelhados na API
e no mobile. Os dois validadores aplicarão os mesmos invariantes.

### Conteúdo-piloto sem alterar progresso existente

Manter todos os IDs e itens atuais. Adicionar ao final da trilha Tem em casa:

1. casa-silabas: nove syllable_position_choose, alternando sílaba inicial e
   final nas palavras da trilha.
2. casa-imagens: nove word_image_choose, uma atividade por palavra, com dois
   distratores curados da mesma trilha.
3. casa-cenas: cinco sentence_image_choose, uma por frase, com dois
   distratores entre as frases publicadas.

Cada item respeitará as letras já ensinadas e terá objetivo, dificuldade,
justificativa contra acerto por eliminação, feedback e revisão pedagógica. As
unidades e IDs novos não alteram conclusões existentes nem exigem migração.

## Passo a passo de execução

- [x] Criar os 14 SVGs próprios e o manifesto de ilustrações no mobile.
- [x] Publicar image_asset e image_alt de palavras/frases no bundle e registrar
      ativos e metadados no seed da API.
- [x] Adicionar os três tipos, sufixos de ID, alvos e renderizadores aos
      contratos compartilhados, API e mobile.
- [x] Estender os validadores para rejeitar sílaba fora da posição pedida,
      entidade não publicada, opção duplicada, ativo sem rótulo ou ID desconhecido.
- [x] Apresentar imagem contextual no componente de escolha e adaptar a montagem
      de sílabas para usar áudio/ilustração sem mostrar a resposta.
- [x] Curar casa-silabas, casa-imagens e casa-cenas com instruções, áudio,
      alternativas, feedback e revisão pendente.
- [x] Gerar o bundle e confirmar que seed e API fornecem conteúdo válido igual.
- [x] Executar testes API/mobile, validação de tipo/build aplicável e corrigir
      falhas antes de marcar a etapa como concluída.
- [ ] Registrar a revisão do integrante de pedagogia: clareza, repetições de
      áudio, erros por distrator e observações antes de promover itens aprovados.

## Critérios de aceite

1. A trilha piloto abre offline e apresenta ilustrações locais com rótulos.
2. Os novos exercícios aceitam somente respostas coerentes com o catálogo.
3. Erro produz feedback e reapresentação sem perder progresso.
4. Bundle inválido não substitui o conteúdo em uso.
5. Testes de contrato, conteúdo, API e mobile estão verdes.
6. A revisão pedagógica humana está registrada para itens liberados.

## Catálogo de `bancoquestoesequiz`: como cada modelo entra no app

O banco PostgreSQL da curadoria (`bancoquestoesequiz/`) é fonte editorial e não é lido pelo app. Um item só chega ao estudante depois de aprovado e convertido, no Estúdio ou em `content_data.py`, para um tipo de `contracts/exercise-types.json`. Ele precisa ter os metadados obrigatórios e uma ilustração própria. O quiz de nivelamento já foi integrado (ADR 0006).

| Modelo do banco | Tipo do app | Ajuste necessário |
| --- | --- | --- |
| 1A, 3A letra inicial pela figura | `initial_sound` | Usar só palavras com letras já apresentadas. |
| 1E letra ouvida | `listen_choose` | Já existe uma por letra; serve como item extra de revisão. |
| 2F sílaba ouvida | `syllable_listen_choose` | Já existe para as consoantes CV. |
| 2B, 2C sílaba inicial ou final | `syllable_position_choose` | Resposta por toque, em vez de digitar. |
| 2D, 2E separar e formar | `word_from_syllables` | Montagem por toque, sem teclado. |
| 3C desenho da palavra | Novo renderizador de escolha por imagem | Exige decisão de contrato. |
| 3D palavra do desenho | `word_image_choose` | Ilustração própria por palavra. |
| 4A ordenar frase | `sentence_order` | Peças já embaralhadas sem rotação na carga. |
| 4B frase da cena | `sentence_image_choose` | Pares mínimos já curados na carga; ilustrar cada cena. |
| 1B, 3B ligar pares; 1C, 1D, 3E digitar | Não entram | O piloto decidiu por decisões individuais por toque (seção de decisões acima). |

## Registro de execução

| Data | Etapa | Resultado | Evidência |
| --- | --- | --- | --- |
| 15/09/2026 | Criação deste roteiro | Concluída | docs/EXERCISES_IMPLEMENTATION_ROADMAP.md |
| 15/09/2026 | Ativos offline, novos contratos e conteúdo-piloto | Concluída tecnicamente | 14 SVGs locais; 23 itens novos; testes API/mobile, typecheck e lint |
