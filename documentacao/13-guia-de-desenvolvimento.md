# Prosa — Guia de desenvolvimento

> **Propósito:** definir as convenções de código, estratégia de branches, padrão de commits e
> checklist de pull request do **Prosa**.

Documentos relacionados: [CONTRIBUINDO](CONTRIBUINDO.md) · [09 — Estrutura](09-estrutura-do-projeto.md).

## Convenções de código

### Python (API e ML)

- Python `>= 3.11`; type hints nos modelos e funções públicas.
- `app/` usa SQLAlchemy 2 declarativo (`Mapped`/`mapped_column`).
- Configuração via `pydantic-settings` (nunca valores fixos no código).
- Segredos somente via `.env` (nunca versionado).

### TypeScript/React Native (mobile)

- TypeScript estrito (`tsc --noEmit`); ESLint com `typescript-eslint`.
- Lógica de negócio em `src/domain/` **sem** dependência de UI/SQLite (testável com Vitest).
- Componentes em `src/components/`; telas em `app/` (expo-router).

### Contratos compartilhados

- Tipos e invariantes vivem em `contracts/*.json`; `apps/api/app/content_types.py` e
  `apps/mobile/src/domain/exercise-types.ts` os espelham. Os testes de cada lado falham em
  caso de divergência.

## Estratégia de branches

O repositório usa branches por iniciativa e merges no `main` (ver histórico com nomes como
`feat/main+preProcessamento` e `pre-processamento`). Recomendação:

- `main` — sempre compilável e testado.
- `feat/<nome>` — nova funcionalidade.
- `fix/<nome>` — correção.
- `docs/<nome>` — documentação.

## Padrão de commits

Histórico observado é descritivo e em português (ex.: "Resolução de duplicidades",
"Tratamento de palavras que contenham 'á'"). Recomendação (Conventional Commits):

```text
feat: adiciona atividade de sílaba final
fix: renova access token antes do push
docs: documenta o Estúdio de conteúdo
refactor: extrai ranking para app/ranking/
```

Ao final de cada mensagem de commit, siga a convenção do repositório
(`Co-Authored-By:` quando gerado por ferramenta).

## Checklist de pull request

- [ ] Testes verdes: `pytest` (API e ML) e `npm test` (mobile).
- [ ] `npm run typecheck` e `npm run lint` no mobile.
- [ ] Se alterou `content_data.py`/seed: regenerou `seed-bundle.json`
      (`scripts/export_content_bundle.py`) e o `test_seed_bundle` passa.
- [ ] Se alterou `contracts/*.json`: espelhou em API e mobile (testes de contrato passam).
- [ ] `git diff --check` sem erros.
- [ ] Sem segredos no diff; sem `apps/api/.env` real.
- [ ] Curadoria registrada: alterações de conteúdo com `review_status` e justificativa.

## Fluxo de curadoria de conteúdo

1. Editar `apps/api/app/content_data.py` (fonte curada) **ou** usar o Estúdio (`/admin`).
2. Validar com `content_lint` (API) e `schema.ts` (mobile) — o catálogo inválido não publica.
3. Publicar (Estúdio) ou regerar o bundle (`export_content_bundle.py`).
4. Registrar revisão pedagógica em `content_reviews` antes de aprovar.

## Machine learning

- Treino/avaliação em `ml/`; o servidor só aplica manifestos promovidos.
- Nova feature exige atualizar `FEATURE_NAMES`, retreinar e republicar o manifesto; o
  servidor recusa features divergentes.
- Retreino semanal do ranking (ADR 0004), apenas com tentativas de quem consentiu.
