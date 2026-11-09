# Documentação do Prosa

> **Propósito:** índice geral da documentação técnica do **Prosa** — aplicativo mobile
> *offline-first* de apoio à alfabetização inicial de jovens e adultos, com API própria,
> catálogo pedagógico server-driven, sincronização offline idempotente e um pipeline de
> aprendizado de máquina condicionado a gates de avaliação.

Esta documentação descreve o estado atual do repositório `DSM-P5-G01-2026-02` em
2026-11-04. Ela é gerada a partir da análise do código-fonte, das decisões registradas
em `docs/adr/` e dos documentos-base em `docs/`. Nada aqui é especulativo: o que não foi
encontrado está marcado como `TODO` ou listado em "Premissas e Dúvidas em Aberto".

## Visão geral

O **Prosa** oferece atividades curtas, guiadas por áudio, para reconhecer letras,
associar letras a sons e formar sílabas e palavras úteis no cotidiano. A experiência é
adulta, acessível e funciona sem conexão permanente. O conteúdo pedagógico é curado
manualmente e servido pela API; o aplicativo sincroniza tentativas e progresso de forma
idempotente quando a conexão retorna.

### Componentes do repositório

```text
apps/mobile/   Expo + React Native + TypeScript + SQLite (offline-first)
apps/api/      FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL (dev: SQLite)
contracts/     tipos de exercício e invariantes pedagógicas compartilhados (JSON)
ml/            treino/avaliação do ranking e do classificador lexical; legado em ml/legacy
infra/         Docker Compose + PostgreSQL + Caddy HTTPS + scripts de backup
docs/          contratos, decisões (docs/adr) e evidências
documentacao/  esta documentação
```

## Índice

| Documento | Conteúdo |
|---|---|
| [01 — Visão geral](01-visao-geral-prosa.md) | Problema, objetivos, escopo, stakeholders |
| [02 — Requisitos](02-requisitos-prosa.md) | RF/RNF com status de implementação |
| [03 — Histórias de usuário](03-historias-de-usuario.md) | Histórias com critérios de aceite |
| [04 — Arquitetura](04-arquitetura-prosa.md) | Estilo, camadas, componentes, decisões |
| [05 — Stack tecnológica](05-stack-tecnologica.md) | Linguagens, bibliotecas, versões |
| [06 — Banco de dados](06-banco-de-dados.md) | Diagrama ER, entidades, migrations |
| [07 — Referência da API](07-referencia-da-api.md) | Endpoints, contratos, autenticação |
| [08 — Guia de instalação](08-guia-de-instalacao.md) | Pré-requisitos, execução local |
| [09 — Estrutura do projeto](09-estrutura-do-projeto.md) | Árvore de pastas anotada |
| [10 — Segurança](10-seguranca.md) | Autenticação, autorização, riscos |
| [11 — Testes](11-testes.md) | Estratégia, como executar, cobertura |
| [12 — Deploy](12-deploy.md) | Build, Docker, CI/CD, ambientes |
| [13 — Guia de desenvolvimento](13-guia-de-desenvolvimento.md) | Convenções, branches, commits, PR |
| [14 — Roadmap e lacunas](14-roadmap-e-lacunas.md) | Proposta × implementação, dívida técnica |
| [15 — Glossário](15-glossario.md) | Termos de domínio e siglas |
| [CONTRIBUINDO](CONTRIBUINDO.md) | Como contribuir |
| [CHANGELOG](CHANGELOG.md) | Registro de mudanças |

### Módulos

| Módulo | Documento |
|---|---|
| Autenticação | [modulos/modulo-autenticacao.md](modulos/modulo-autenticacao.md) |
| Catálogo e conteúdo | [modulos/modulo-conteudo.md](modulos/modulo-conteudo.md) |
| Sincronização | [modulos/modulo-sincronizacao.md](modulos/modulo-sincronizacao.md) |
| Progresso e repetição espaçada | [modulos/modulo-progresso-repeticao-espacada.md](modulos/modulo-progresso-repeticao-espacada.md) |
| Ranking no servidor | [modulos/modulo-ranking.md](modulos/modulo-ranking.md) |
| Placar e ligas | [modulos/modulo-leaderboard.md](modulos/modulo-leaderboard.md) |
| Estúdio de conteúdo | [modulos/modulo-estudio-de-conteudo.md](modulos/modulo-estudio-de-conteudo.md) |
| Vocabulário e ML lexical | [modulos/modulo-vocabulario-ml.md](modulos/modulo-vocabulario-ml.md) |
| Aplicativo mobile | [modulos/modulo-mobile.md](modulos/modulo-mobile.md) |

### Decisões de arquitetura (ADR)

- [ADR 0001 — Conteúdo server-driven](adr/0001-conteudo-server-driven.md)
- [ADR 0002 — Modelo de conteúdo](adr/0002-modelo-de-conteudo.md)
- [ADR 0003 — Repetição espaçada por item](adr/0003-repeticao-por-item.md)
- [ADR 0004 — Reabertura de ML como ranking](adr/0004-reabertura-de-ml-como-ranking.md)
- [ADR 0005 — Classificador de dificuldade lexical](adr/0005-classificador-dificuldade-lexical.md)

> Os ADRs originais vivem em [`docs/adr/`](../docs/adr/). Os arquivos em
> `documentacao/adr/` são reproduções fiéis para consulta dentro desta documentação.

## Como começar

1. Leia [01 — Visão geral](01-visao-geral-prosa.md) para entender o produto.
2. Leia [04 — Arquitetura](04-arquitetura-prosa.md) para entender o sistema.
3. Siga [08 — Guia de instalação](08-guia-de-instalacao.md) para rodar o projeto.
