# Relatório de validação do MVP

Data da rodada: 10 de setembro de 2026.

## Resultado automatizado

| Área | Verificação | Resultado |
|---|---|---|
| Mobile | Vitest | 6 arquivos e 17 testes aprovados |
| Mobile | TypeScript e ESLint | aprovados |
| Mobile | `expo install --check` | dependências compatíveis |
| Mobile | export Android | aprovado; bundle inclui 26 WAVs e o modelo ONNX |
| API | Pytest | 4 testes aprovados |
| API | Alembic | upgrade, downgrade e novo upgrade aprovados |
| API | seed | 26 lições, 78 exercícios e 6 palavras |
| API | OpenAPI | endpoints e resposta `accepted_ids` confirmados |
| ML | Pytest | 5 testes aprovados |
| ML | ONNX Runtime | classe e 26 probabilidades retornadas |
| Infra | Docker Compose | configuração validada |
| Infra | containers | API e PostgreSQL saudáveis; `/health` retornou 200 |
| Infra | backup/restauração | dump e restauração em banco de teste aprovados |
| Repositório | `git diff --check` | aprovado |

## Cobertura funcional

- cadastro, login, rotação de refresh token, logout e continuidade local da sessão;
- 26 letras maiúsculas progressivas, três exercícios por letra e leitura dinâmica dos enunciados por TTS;
- cartões com imagens, áudio das palavras e inserção da letra na lacuna por toque;
- tentativas, progresso e fila persistidos em SQLite;
- push/pull com cursor, retry exponencial, resolução determinística e idempotência;
- isolamento de usuários e rejeição de imagem bruta no contrato da API;
- Classificador A com bootstrap pedagógico e Classificador B com fallback por regras;
- stack de produção com API, PostgreSQL, proxy HTTPS, volumes, health checks e rotinas de backup.

## Métricas do artefato demonstrativo

- accuracy: 0,94444;
- precision macro: 0,95330;
- recall macro: 0,94444;
- F1 macro: 0,94465;
- tamanho ONNX: 33.934 bytes;
- limiar de incerteza: 0,65.

Essas métricas medem um dataset sintético separado por escritor e comprovam a integração técnica. O manifesto define `promotionAllowed=false`; os números não representam eficácia com estudantes ou escrita real.

## Evidências externas ainda necessárias

O código e os artefatos do MVP estão completos para a validação controlada, mas estas evidências não podem ser fabricadas por testes locais:

- aprovação da sequência, voz e linguagem pelo integrante capacitado do grupo;
- teste do fluxo completo em Android físico, incluindo TalkBack, fechamento e reabertura;
- smoke test iOS/VoiceOver em ambiente de build disponível;
- avaliação com amostras reais consentidas e comparação pré-teste/pós-teste;
- implantação na VPS autorizada, DNS/HTTPS público e restauração no ambiente remoto.

O `npm audit` registra 13 vulnerabilidades moderadas em dependências transitivas do Expo. A correção automática sugerida exige versões incompatíveis; elas devem ser reavaliadas na próxima atualização do SDK, sem aplicar upgrade destrutivo ao MVP validado.
