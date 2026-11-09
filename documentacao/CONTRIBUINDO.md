# Contribuindo com o Prosa

> **Propósito:** orientar contribuições ao repositório do **Prosa**.

## Começando

1. Leia [`01-visao-geral-prosa.md`](01-visao-geral-prosa.md) e
   [`04-arquitetura-prosa.md`](04-arquitetura-prosa.md).
2. Rode o projeto seguindo [`08-guia-de-instalacao.md`](08-guia-de-instalacao.md).
3. Siga as convenções de [`13-guia-de-desenvolvimento.md`](13-guia-de-desenvolvimento.md).

## Fluxo de trabalho

1. Crie uma branch a partir de `main` (`feat/`, `fix/`, `docs/`).
2. Implemente com testes quando aplicável.
3. Rode a validação completa (testes, typecheck, lint, `git diff --check`).
4. Abra um pull request com descrição clara e o checklist preenchido.

## Áreas sensíveis

- **Conteúdo curado** (`apps/api/app/content_data.py`): qualquer alteração é curadoria e deve
  ser acompanhada de justificativa e, idealmente, revisão pedagógica.
- **Contratos** (`contracts/*.json`): altere junto com API e mobile; os testes de paridade
  falham se divergirem.
- **Machine learning** (`ml/`): não altere o gate de promoção sem reavaliar as baselines e os
  cortes (ADR 0004/0005).
- **Segredos**: nunca versione `.env` real, senhas ou tokens.

## Comunicação

Use linguagem respeitosa e objetiva. O público final são adultos em alfabetização; evite
infantilização e linguagem punitiva também no código e nos textos.
