# Relatório de validação do MVP

Data da rodada: 15 de setembro de 2026.

## Resultado automatizado

| Área | Verificação | Resultado |
|---|---|---|
| Mobile | Vitest | 7 arquivos e 24 testes aprovados |
| Mobile | TypeScript e ESLint | aprovados |
| Mobile | `expo install --check` | dependências compatíveis |
| Mobile | export Android | aprovado na rodada de 10 de setembro; o app não embarca áudio, todo som vem do TTS do aparelho |
| Mobile | bundle semente | `seed-bundle.json` idêntico ao seed da API e aprovado pelo validador do app |
| API | Pytest | 21 testes aprovados |
| API | Alembic | upgrade, downgrade e novo upgrade aprovados, incluindo a migração de IDs legados com mesclagem de progresso duplicado |
| API | seed | 26 lições progressivas, 96 exercícios (ouvir, reconhecer, localizar e completar) e 11 palavras com pré-requisitos; content-lint sem erros |
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
- cartões com imagens, áudio das palavras e inserção da letra na lacuna por toque;
- tentativas, progresso e fila persistidos em SQLite;
- push/pull com cursor, retry exponencial, resolução determinística e idempotência;
- isolamento de usuários e rejeição de imagem bruta no contrato da API;
- IDs canônicos compartilhados entre app e API, com tradução de IDs legados na sincronização;
- regras explícitas de pré-requisito, domínio e revisão;
- stack de produção com API, PostgreSQL, proxy HTTPS, volumes, health checks e rotinas de backup.

## Métricas do conteúdo adaptativo

O catálogo atual usa regras explícitas de pré-requisito e dificuldade. Nenhum modelo adaptativo é promovido neste estágio, porque ainda não há dados de uso suficientes nem avaliação pedagógica separada.

## Evidências externas ainda necessárias

O código e os artefatos do MVP estão completos para a validação controlada, mas estas evidências não podem ser fabricadas por testes locais:

- aprovação da sequência, voz e linguagem pelo integrante capacitado do grupo;
- teste do fluxo completo em Android físico, incluindo TalkBack, fechamento e reabertura;
- smoke test iOS/VoiceOver em ambiente de build disponível;
- avaliação com amostras reais consentidas e comparação pré-teste/pós-teste;
- implantação na VPS autorizada, DNS/HTTPS público e restauração no ambiente remoto.

O `npm audit` registra 13 vulnerabilidades moderadas em dependências transitivas do Expo. A correção automática sugerida exige versões incompatíveis; elas devem ser reavaliadas na próxima atualização do SDK, sem aplicar upgrade destrutivo ao MVP validado.
