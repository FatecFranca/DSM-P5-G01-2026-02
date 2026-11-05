# Prosa — Visão geral

> **Propósito:** apresentar o problema, a proposta de valor, os objetivos, o escopo e os
> stakeholders do **Prosa**, o aplicativo de apoio à alfabetização inicial de jovens e
> adultos.

Documentos relacionados: [02 — Requisitos](02-requisitos-prosa.md) ·
[04 — Arquitetura](04-arquitetura-prosa.md) · [14 — Roadmap e lacunas](14-roadmap-e-lacunas.md) ·
[Documento-base original](../docs/PROJECT_FOUNDATION.md).

## O problema

A alfabetização inicial de jovens e adultos é pouco atendida por interfaces que não sejam
infantilizadas. O público adulto precisa de uma experiência respeitosa, com autonomia,
feedback imediato e que não dependa de conexão permanente — requisitos que a maioria dos
aplicativos educacionais voltados à infância não cumpre.

## Proposta de valor

O **Prosa** entrega aprendizado com autonomia, em pequenas etapas, usando uma interface
adulta, acessível e capaz de dar retorno imediato sem depender de conexão permanente.

**Hipótese do produto:** uma experiência simples, guiada por áudio e baseada em palavras
do cotidiano pode aumentar a prática e a confiança do aluno quando comparada a uma
interface textual e infantilizada.

## Objetivos

- Apoiar o reconhecimento de letras, a associação letra–som e a formação de sílabas e
  palavras úteis no cotidiano.
- Oferecer atividades curtas e guiadas por áudio, com repetição sob demanda.
- Funcionar parcialmente sem internet, sincronizando tentativas e progresso de forma
  idempotente.
- Manter um catálogo pedagógico curado manualmente e versionado, sem conteúdo gerado ou
  recomendado automaticamente sem revisão pedagógica.

## Escopo do MVP

O MVP comprova este fluxo completo:

1. usuário entra em uma sessão de estudo;
2. ouve a instrução e pode repeti-la;
3. reconhece uma letra em atividades objetivas;
4. localiza a letra em uma palavra contextualizada;
5. o app apresenta feedback cuidadoso;
6. resultado e progresso são salvos localmente e sincronizados quando possível.

### Conteúdo do MVP

- As 26 letras do alfabeto, apresentadas progressivamente na ordem
  `A, E, I, O, U, M, L, P, S, T, R, N, D, C, G, B, F, V, H, Q, J, K, Z, X, W, Y`, com `G`
  na segunda fase.
- 16 tipos de exercício (ver [15 — Glossário](15-glossario.md)), cobrindo letras, sílabas,
  palavras e frases.
- Trilhas temáticas de cotidiano, com a primeira (`Tem em casa`) implementada e a segunda
  (`Família`) em conteúdo inicial.
- Progresso por unidade (resumo derivado do estado por item) e histórico de tentativas.
- Áudio por texto para fala (TTS) com botão de repetição; sem arquivos de áudio embarcados.

### Fora do MVP

- Alfabetização completa.
- Produção livre de textos.
- Chatbot ou geração automática de conteúdo sem revisão pedagógica.
- Reconhecimento de escrita, traçado ou escrita manuscrita.
- Ranking social (ver nota em [14 — Roadmap e lacunas](14-roadmap-e-lacunas.md)); o que
  existe é um **placar entre aprendizes** (leaderboard/ligas), distinto do ranking de itens.

## Stakeholders

| Stakeholder | Papel |
|---|---|
| Equipe do projeto (Ana Laura Lis, Carlos Costa, Gustavo Daniel, Larissa Coutinho) | Desenvolvimento, curadoria e operação |
| Integrante capacitado do grupo | Revisão pedagógica da sequência, linguagem e testes |
| Aprendizes (jovens e adultos) | Usuários finais |
| Orientação acadêmica | Avaliação e critérios de sucesso |

## Critérios de sucesso do primeiro incremento

O primeiro incremento estará concluído quando uma pessoa conseguir abrir uma lição, ouvir
a instrução, reconhecer uma letra, localizá-la em uma palavra e visualizar seu resultado
depois de fechar e reabrir o aplicativo — inclusive sem implementar ainda toda a trilha de
alfabetização. Este critério foi validado em emulador Android em 11/09/2026 (ver
[Relatório de validação](../docs/VALIDATION_REPORT.md)).

## Premissas e limites

- Android é o primeiro dispositivo de validação; a arquitetura permanece multiplataforma.
- O primeiro login ocorre online; depois disso as sessões podem continuar offline.
- O MVP não coleta áudio nem imagens brutas de usuários.
- Testes com usuários reais dependem de consentimento e autorização do grupo.
- A aprovação pedagógica humana continua pendente (`pending_human_review`) para os itens
  curados, antes de qualquer liberação definitiva.
