# ADR 0001 — Conteúdo server-driven

Data: 15 de setembro de 2026. Status: aceito.

## Contexto

Até `9eea1d3` o aplicativo carregava o catálogo de lições de `apps/mobile/src/domain/catalog.ts`, gerado em tempo de build, e a API mantinha um segundo catálogo em `apps/api/app/seed.py`. Os dois divergiam em nomes de tipo (`recognize` × `recognize_letter`), em IDs (`letter-a`/`A-listen` × `lesson-A`/`exercise-A-listen`) e em conteúdo. Como `progress.lesson_id` e `attempts.exercise_id` não têm chave estrangeira, todo dado sincronizado era gravado sob IDs que o catálogo servido não conhecia, e o `pull` devolvia progresso sob chaves que nenhuma tela procurava.

Qualquer trilha temática, exercício de sílaba ou ranking adaptativo depende de conteúdo que possa mudar sem um novo build e de tentativas ligadas a itens reais.

## Decisão

1. O servidor é a única fonte do catálogo. `GET /v1/content` responde com `ETag` derivado do próprio conteúdo e honra `If-None-Match` (`304`).
2. O aplicativo embarca `assets/content/seed-bundle.json`, gerado por `apps/api/scripts/export_content_bundle.py` a partir do seed; `tests/test_seed_bundle.py` falha se o arquivo commitado divergir. No primeiro boot ele é usado offline; depois, o app baixa o conteúdo e o guarda em SQLite (`content_bundle`).
3. Um bundle só substitui o conteúdo em uso se passar em `validateBundle` (`apps/mobile/src/content/schema.ts`), que espelha `apps/api/app/content_lint.py`. As duas implementações validam as mesmas regras pedagógicas.
4. Tipos de exercício, ordem das letras, fases e exceções ficam em `contracts/*.json`. `app/content_types.py` e `src/domain/exercise-types.ts` os espelham e os testes de cada lado falham em caso de divergência. O nome canônico é `recognize_letter`; `recognize` é traduzido por uma release.
5. IDs canônicos são os do servidor (`lesson-A`, `exercise-A-listen`). A migration `20260915_canonical_content_ids` reescreve dados antigos e mescla duplicatas; `sync.py` traduz IDs legados e registra `deprecated_id` para medir quando remover o alias.
6. `completed_types` passa a ser persistido; `confidence`/`uncertain` (resíduos do classificador manuscrito removido) saem do contrato, e `model_version` vira `served_model_version`, reservado ao ranking no servidor. Tentativas passam a carregar `lesson_id` e `exercise_type`.

## Emenda de 11 de setembro de 2026 — rejeição por evento no push

O push era tudo-ou-nada: um único evento que o catálogo atual não reconhece derrubava o lote inteiro com 422, e o cliente reenviava o mesmo lote para sempre. Um aparelho de teste ficou com a fila travada desde `9eea1d3` por causa de tentativas do exercício de escrita manuscrita (`A-write`), removido naquele commit: 61 eventos represados, nenhum progresso sincronizado.

`POST /v1/sync/push` passa a responder 200 com `rejected`, `rejected_ids` e `rejections` (com motivo) para eventos cujo item ou unidade não existe; os demais eventos do lote são gravados normalmente. O app tira da fila os aceitos **e** os rejeitados, registrando o motivo. Payload malformado continua 422 — isso é erro de programação, não dado histórico.

## Consequências

- Curadoria vira dado versionado no servidor, sem build do app.
- Tentativas e progresso referenciam itens reais; o dataset de treino futuro deixa de conter linhas órfãs.
- O app continua funcionando sem rede desde o primeiro boot.
- Cada mudança de payload exige janela de compatibilidade (`extra="forbid"`); por isso todas as mudanças desta fase entraram juntas.
