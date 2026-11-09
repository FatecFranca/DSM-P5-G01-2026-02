# Prosa — Histórias de usuário

> **Propósito:** descrever as histórias de usuário do **Prosa** com critérios de aceite no
> formato Dado/Quando/Então.

Documentos relacionados: [02 — Requisitos](02-requisitos-prosa.md) ·
[01 — Visão geral](01-visao-geral-prosa.md).

## Personas

- **Aprendiz** — jovem ou adulto em alfabetização inicial, com pouca familiaridade digital.
- **Administrador acadêmico** — pessoa da equipe que cura o catálogo no Estúdio local.
- **Integrante capacitado** — responsável pela revisão pedagógica da sequência e linguagem.

## US-01 — Cadastro e entrada

Como **aprendiz**, quero criar uma conta e entrar, para que meu progresso fique associado a
mim.

- **Dado** que estou na tela de autenticação
- **Quando** informo e-mail e senha válidos e confirmo
- **Então** recebo um par de tokens (acesso + refresh) e vejo a tela inicial do app.

Critérios extras: e-mail duplicado retorna `409`; senha curta é rejeitada na validação.

## US-02 — Login com Google

Como **aprendiz**, quero entrar com minha conta Google, para não precisar memorizar senha.

- **Dado** que o provedor Google está habilitado no Firebase
- **Quando** autorizo a conta Google no dispositivo
- **Então** recebo os tokens do app e minha conta é criada/vínculada pelo e-mail.

## US-03 — Sessão de estudo de uma letra

Como **aprendiz**, quero abrir uma lição de letra, ouvir a instrução e responder às
atividades, para praticar o reconhecimento.

- **Dado** que a letra está liberada (pré-requisitos atendidos)
- **Quando** abro a lição e respondo às atividades por toque
- **Então** ouço as instruções por áudio, recebo feedback após cada resposta e concluo a
  sessão com um resumo de acertos e erros.

## US-04 — Repetição de áudio e reinício

Como **aprendiz**, quero repetir o áudio e reiniciar uma atividade, para ouvir de novo sem
punição.

- **Dado** que estou em uma atividade
- **Quando** toco no botão de repetir ou reinicio a atividade
- **Então** o áudio toca novamente e a atividade volta ao início, sem penalizar meu
  progresso.

## US-05 — Funcionamento offline

Como **aprendiz**, quero continuar uma sessão sem internet, para estudar em qualquer lugar.

- **Dado** que o app já abriu uma vez e carregou o catálogo (bundle semente)
- **Quando** desligo a rede e concluo atividades
- **Então** minhas tentativas e progresso são salvos no SQLite local.

## US-06 — Sincronização sem duplicação

Como **aprendiz**, quero que meu progresso seja enviado ao servidor quando a rede voltar,
sem duplicar.

- **Dado** que há eventos represados na fila local
- **Quando** a conexão retorna e a sincronização roda
- **Então** cada tentativa é enviada uma única vez (idempotência) e o pull traz o estado
  de outros aparelhos.

## US-07 — Rejeição de eventos desconhecidos

Como **sistema**, quero que eventos de conteúdo removido sejam rejeitados sem travar a
fila.

- **Dado** que um evento aponta para um item/une que não existe no catálogo
- **Quando** o push processa o lote
- **Então** o evento é marcado como rejeitado (com motivo), os demais são gravados e o
  cliente remove aceitos e rejeitados da fila.

## US-08 — Revisão espaçada

Como **aprendiz**, quero que o app reapresente itens que errei e que vençam com o tempo,
para reforçar a memória.

- **Dado** que um item foi errado (ou dominado e venceu)
- **Quando** monto uma nova sessão
- **Então** itens vencidos e fracos vêm primeiro, e o item errado volta na mesma sessão.

## US-09 — Progresso e perfil

Como **aprendiz**, quero ver meu progresso e meus pontos, para acompanhar minha evolução.

- **Dado** que tenho tentativas sincronizadas
- **Quando** abro as telas de progresso e ranking
- **Então** vejo o estado por unidade, meus pontos, minha liga e o placar da semana.

## US-10 — Consentimento de pesquisa

Como **aprendiz**, quero decidir se minhas tentativas podem ser usadas em pesquisa,
separadamente do cadastro.

- **Dado** que estou autenticado
- **Quando** ativo ou removo o consentimento em `PUT /v1/me/research-consent`
- **Então** o consentimento é registrado com data e pode ser retirado a qualquer momento.

## US-11 — Curadoria no Estúdio de conteúdo

Como **administrador acadêmico**, quero editar, validar e publicar o catálogo, para que o
app receba conteúdo revisado.

- **Dado** que a conta administrativa local foi configurada
- **Quando** edito um rascunho, importo imagens e publico
- **Então** o catálogo é validado pelo mesmo `content_lint` do app, a publicação é atômica,
  muda o `ETag` de `/v1/content` e pode ser restaurada.

## US-12 — Vocabulário e ML lexical

Como **administrador acadêmico**, quero ver a dificuldade predita das palavras e confirmar
ou corrigir, para treinar o classificador com rótulos humanos.

- **Dado** que o classificador lexical está promovido
- **Quando** abro a aba Vocabulário ML e registro feedback
- **Então** o rótulo é salvo (`pending`/`confirmed`/`corrected`) e pode ser exportado para
  retreino.
