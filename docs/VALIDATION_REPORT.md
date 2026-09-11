# Relatório de validação do MVP

Data da rodada: 11 de setembro de 2026 (fluxo completo em emulador Android).

## Resultado automatizado

| Área | Verificação | Resultado |
|---|---|---|
| Mobile | Vitest | 10 arquivos e 42 testes aprovados |
| Mobile | TypeScript e ESLint | aprovados |
| Mobile | `expo install --check` | dependências compatíveis |
| Mobile | export Android | aprovado na rodada de 10 de setembro; o app não embarca áudio, todo som vem do TTS do aparelho |
| Mobile | bundle semente | `seed-bundle.json` idêntico ao seed da API e aprovado pelo validador do app |
| API | Pytest | 34 testes aprovados |
| ML | Pytest | 9 testes aprovados (replay sem vazamento, treino sintético promovido pelo gate, gate reprovando modelos pequenos/mal calibrados/perdedores, classificador legado) |
| API | Alembic | upgrade, downgrade e novo upgrade aprovados, incluindo a migração de IDs legados com mesclagem de progresso duplicado e a migração do modelo de conteúdo (renomes, chaves estrangeiras e sílabas em lista) com dados legados; `item_states`, contexto de sessão nas tentativas, `ranking_logs` e consentimento de pesquisa |
| API | seed | 29 unidades (26 letras + trilha «Tem em casa»), 134 itens em 9 tipos, 18 palavras curadas e 1187 candidatas do corpus fora do bundle; seed idempotente; content-lint sem erros |
| API | `/v1/content` | `ETag` derivado do conteúdo e resposta `304` confirmados |
| Contratos | `contracts/*.json` | API e mobile espelham os mesmos tipos, ordem, fases e exceções |
| API | OpenAPI | endpoints e resposta `accepted_ids` confirmados |
| Infra | Docker Compose | configuração validada |
| Infra | containers | API e PostgreSQL saudáveis; `/health` retornou 200 |
| Infra | backup/restauração | dump e restauração em banco de teste aprovados |
| Repositório | `git diff --check` | aprovado |

## Cobertura funcional

- cadastro, login, rotação de refresh token, logout e continuidade local da sessão;
- 26 letras maiúsculas progressivas em três fases, com `G` na segunda, exercícios de reconhecimento/localização/completar e leitura dinâmica dos enunciados por TTS;
- catálogo servido pela API com cache local e bundle semente para o primeiro boot offline;
- trilha temática «Tem em casa» com exercícios de sílaba, palavra e frase, liberada pelas letras dominadas e nunca pela trilha;
- cartões com imagens, áudio das palavras e inserção da letra na lacuna por toque;
- tentativas, progresso e fila persistidos em SQLite;
- push/pull com cursor, retry exponencial, resolução determinística e idempotência;
- isolamento de usuários e rejeição de imagem bruta no contrato da API;
- IDs canônicos compartilhados entre app e API, com tradução de IDs legados na sincronização;
- repetição espaçada por item (meia-vida 4 h × 2^força, limites 4 h–90 d), fila de sessão determinística e reapresentação do item errado na mesma sessão;
- progresso por unidade derivado dos itens, com estado de revisão quando um item dominado vence;
- tentativas com contexto de sessão (posição, índice de reapresentação, repetições de áudio, tempo até a primeira interação, política que serviu o item);
- `POST /v1/ranking/next` com regras como piso, fallback por item, shadow mode, ε-exploração e registro em `ranking_logs`; consentimento de pesquisa por usuário;
- renovação automática do access token na sincronização, com encerramento da sessão quando o refresh é recusado;
- rejeição por evento no push: conteúdo desconhecido sai da fila com motivo, sem derrubar o lote;
- stack de produção com API, PostgreSQL, proxy HTTPS, volumes, health checks e rotinas de backup.

## Métricas do conteúdo adaptativo

A adaptação atual é por regras explícitas (ADR 0003): pré-requisito por letras, repetição espaçada por item e reapresentação de erros. O ranking por modelo (ADR 0004) existe, está desligado em produção e só será promovido por manifesto que passe no gate de replay (log-loss abaixo de regras, taxa histórica e constante nos cortes temporal e por usuário; ECE ≤ 0,05; ≥ 200 linhas) sobre tentativas de usuários com consentimento. Em dados sintéticos o pipeline promove; com dados reais ainda não há volume, e a reprovação do gate é o resultado esperado.

## Fluxo completo em emulador (11 de setembro de 2026)

Executado em emulador Android (Pixel 10, API 37) contra a API local e o PostgreSQL de desenvolvimento, com 26 verificações automatizadas de API mais a navegação manual pelo aplicativo:

- trilha respeitando o portão de letras (vogais concluídas, `M` liberada, demais bloqueadas);
- sessão da letra `M` com os quatro tipos, incluindo a sílaba `MA` falada pelo TTS;
- erro reapresentado na mesma sessão e contagem de restantes correta;
- `find_in_word` usando `MEU`, a palavra curada que respeita as letras já apresentadas;
- sincronização de 61 eventos represados, com progresso e estados por item chegando ao servidor;
- `POST /v1/ranking/next` registrado em `ranking_logs` com `rules-fallback` e motivo `model_disabled`, como esperado com o modelo desligado.

Dois defeitos foram encontrados nesse fluxo e corrigidos: o aplicativo nunca renovava o access token (após 15 minutos a sincronização falhava exibindo "modo offline") e o push era tudo-ou-nada (um evento de exercício removido travava a fila para sempre). Ambos têm teste automatizado.

## Evidências externas ainda necessárias

O código e os artefatos do MVP estão completos para a validação controlada, mas estas evidências não podem ser fabricadas por testes locais:

- aprovação da sequência, voz e linguagem pelo integrante capacitado do grupo;
- teste do fluxo completo em Android físico, incluindo TalkBack, fechamento e reabertura;
- smoke test iOS/VoiceOver em ambiente de build disponível;
- avaliação com amostras reais consentidas e comparação pré-teste/pós-teste;
- implantação na VPS autorizada, DNS/HTTPS público e restauração no ambiente remoto.

O `npm audit` registra 13 vulnerabilidades moderadas em dependências transitivas do Expo. A correção automática sugerida exige versões incompatíveis; elas devem ser reavaliadas na próxima atualização do SDK, sem aplicar upgrade destrutivo ao MVP validado.
