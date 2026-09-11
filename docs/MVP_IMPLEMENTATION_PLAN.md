<!-- markdownlint-disable MD013 -->

# Alfabetiza — plano de implementação do MVP

## Objetivo

Levar o Alfabetiza do repositório vazio a um MVP mobile estruturado, seguindo o [documento-base do projeto](./PROJECT_FOUNDATION.md), com API própria em Python, funcionamento offline, sincronização online, associação de letras a palavras e hospedagem na VPS Azure.

## Arquitetura definida

- **Mobile:** React Native, TypeScript, Expo Router, Zustand e TanStack Query.
- **Persistência local:** `expo-sqlite` para conteúdo, sessão, tentativas, progresso e fila de sincronização; `expo-secure-store` para tokens.
- **Áudio:** `expo-speech` para ler dinamicamente o enunciado exibido, em português do Brasil, com botão de repetição.
- **API:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy 2 e Alembic.
- **Autenticação:** JWT de curta duração, refresh token rotativo e senhas protegidas com Argon2id.
- **Banco:** PostgreSQL.
- **Conteúdo adaptativo:** regras transparentes de pré-requisito, domínio e revisão; modelos estatísticos ficam fora do primeiro incremento.
- **Atividade de palavras:** cartões com imagem, áudio por texto para fala e lacuna preenchida por toque.
- **Infraestrutura:** Docker Compose, proxy HTTPS, API e PostgreSQL na VPS Azure.

A API e o catálogo pedagógico serão projetos Python separados. A imagem de produção da API não deve carregar ferramentas de análise que não sejam necessárias ao runtime.

## Etapas de implementação

### 1. Formalizar o contrato do MVP

- Revisar objetivos, sequência, linguagem, privacidade e critérios com o integrante capacitado do grupo.
- Fixar as 26 letras do alfabeto apresentadas progressivamente na ordem `A, E, I, O, U, M, L, P, S, T, R, N, D, C, G, B, F, V, H, Q, J, K, Z, X, W, Y`.
- Definir letras maiúsculas de forma como primeiro formato.
- Selecionar sílabas e 8 a 12 palavras contextualizadas.
- Organizar a sequência em três fases, com `G` na segunda fase e palavras liberadas apenas após seus pré-requisitos.
- Confirmar o núcleo de exercícios: ouvir e escolher, reconhecer letra e localizar a letra em uma palavra; completar palavra entra quando os pré-requisitos estiverem disponíveis.
- Definir a primeira trilha de cotidiano (`Tem em casa`) e reservar as seguintes (`Família`, `Esporte`, `Trabalho`, `Saúde`, `Transporte`, `Compras` e `Documentos`) para a expansão progressiva.

**Verificação:** escopo aprovado, catálogo inicial definido e critérios de sucesso registrados.

### 2. Estruturar o repositório

Criar a estrutura:

```text
apps/mobile/
apps/api/
ml/
infra/
docs/
```

Configurar Expo, FastAPI, ambientes Python, TypeScript, lint, testes, variáveis de ambiente e comandos de desenvolvimento.

**Verificação:** instalação limpa, aplicativo iniciado, API respondendo `/health` e testes básicos executando.

### 3. Preparar conteúdo pedagógico e áudio

- Criar fixtures versionadas para letras, lições, exercícios, sílabas, palavras e instruções.
- Revisar os enunciados que serão enviados ao TTS e validar pronúncia, ritmo e clareza em Android e iOS.
- Orientar a instalação da voz em português do Brasil quando ela não estiver disponível no aparelho.
- Adicionar repetição de todas as instruções.

**Verificação:** validador confirma as 26 letras, exercícios completos, mídias existentes e reprodução local.

### 4. Preparar a adaptação de conteúdo

- Definir metadados linguísticos e contextuais das palavras e frases.
- Começar com regras transparentes de dificuldade e pré-requisitos.
- Registrar revisão pedagógica, fonte de frequência e versão de cada palavra e frase.
- Não treinar nem incluir modelo de escrita, traçado ou reconhecimento manuscrito no produto atual.

**Verificação:** catálogo reproduzível, regras explicáveis e nenhuma recomendação automática sem dados suficientes.

> **Emenda de 18 de setembro de 2026 (ADR 0004).** "Recomendação automática" passa a existir como ranking no servidor, condicionada ao gate de avaliação por replay (log-loss, Brier, ECE contra regras, taxa histórica e constante), a consentimento de pesquisa e a shadow mode antes de servir. O item sobre escrita manuscrita permanece.

### 5. Implementar a API própria

Criar módulos independentes para autenticação, conteúdo, progresso, tentativas e sincronização.

Endpoints iniciais:

```text
POST /v1/auth/register
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/content
GET  /v1/progress
POST /v1/sync/push
GET  /v1/sync/pull
GET  /health
```

Entidades mínimas: `users`, `modules`, `lessons`, `exercises`, `words`, `attempts`, `progress`, `sync_events` e sessões de autenticação.

Cada tentativa deve possuir `client_attempt_id` único por usuário para impedir duplicação durante reenvios.

**Verificação:** testes de integração cobrem autenticação, validação, isolamento de usuários, migrations, seed e idempotência.

### 6. Criar a primeira fatia vertical mobile

Implementar sessão de estudo, instrução, áudio, exercícios de escolha, cartões de palavras com lacunas, preenchimento por toque, feedback e persistência local.

**Verificação:** uma pessoa inicia uma lição, ouve as palavras, escolhe a lacuna correta, recebe feedback, fecha e reabre o aplicativo vendo o resultado salvo.

### 7. Implementar sincronização offline/online

- Criar banco SQLite local para conteúdo, sessão, tentativas, progresso e fila de saída.
- Implementar envio em lote, retry, backoff e cursor de sincronização.
- Processar eventos no servidor de forma idempotente.
- Definir resolução determinística para conflitos de progresso.
- Não coletar áudio, imagem ou conteúdo pessoal adicional nesta etapa.

**Verificação:** concluir atividades sem internet, reconectar e confirmar sincronização única, sem perda ou duplicação.

### 8. Expandir para o MVP pedagógico completo

- Adicionar as 26 letras progressivas.
- Completar os três tipos de exercício.
- Adicionar histórico de tentativas e progresso por lição.
- Adicionar sílabas e 8 a 12 palavras com pré-requisitos explícitos.
- Organizar palavras e frases na primeira trilha de cotidiano, mantendo regras transparentes de desbloqueio e revisão.
- Medir comportamento por atividade e trilha antes de considerar qualquer adaptação estatística.

**Verificação:** conjunto de teste separado, F1 macro calculado e nenhuma versão promovida sem avaliação.

### 9. Preparar Azure, segurança e acessibilidade

- Provisionar VPS Ubuntu com Docker Compose, firewall e HTTPS.
- Configurar volumes persistentes, backups e restauração testada.
- Configurar logs sem dados pessoais desnecessários.
- Revisar contraste, tamanho dos botões, leitor de tela, rótulos, linguagem, consentimento e retenção.
- Configurar health check e reinício seguro dos serviços.

**Verificação:** API acessível por HTTPS, backup restaurável, secrets fora do Git e checklist de acessibilidade concluído.

### 10. Executar a verificação final

- Executar testes unitários, integração, mobile e API.
- Validar o fluxo em dispositivo físico Android.
- Realizar smoke test iOS quando houver ambiente de build disponível.
- Executar lint, typecheck, build, validação do catálogo e `git diff --check`.
- Registrar limitações, métricas e evidências no relatório do projeto.

**Critério final:** o MVP funciona offline, sincroniza com a API na VPS Azure, cobre as 26 letras progressivamente, registra progresso e apresenta métricas documentadas.

## Dependências críticas

```text
contrato pedagógico
        ↓
catálogo de letras e sílabas
        ↓
primeira fatia vertical
        ↓
API + persistência + sync
        ↓
trilhas de cotidiano
        ↓
avaliação e deploy
```

Qualquer adaptação estatística futura não deve bloquear a primeira fatia funcional.

## Testes e critérios de aceite

- **API:** autenticação, autorização, validação, migrations, isolamento e idempotência.
- **Mobile:** navegação, áudio, cartões de palavras, preenchimento por toque, persistência e modo offline.
- **Conteúdo adaptativo:** comparação entre dificuldade definida pela equipe e comportamento observado por palavra e trilha.
- **Sincronização:** reenvio seguro, perda de conexão, retry e ausência de duplicação.
- **Infraestrutura:** HTTPS, reinício dos containers, backup e restauração.
- **Produto:** conclusão da primeira lição, evolução entre pré-teste e pós-teste e clareza percebida pelos participantes.

## Premissas e limites

- Android será o primeiro dispositivo de validação; a arquitetura continuará multiplataforma.
- A VPS Azure terá aproximadamente 4 vCPU, 8 GB de RAM e 80 GB SSD.
- O primeiro login ocorrerá online; depois disso, as sessões poderão continuar offline.
- A atividade atual não coleta áudio ou imagens brutas de usuários.
- Testes com usuários reais dependem de consentimento e autorização do grupo.
- Traçado, escrita manuscrita e classificação de escrita não fazem parte do escopo atual; qualquer retorno dependerá de nova decisão explícita e revisão pedagógica.
- Adaptação estatística: reaberta em 18 de setembro de 2026 como ranking no servidor (ADR 0004), desligada em produção até assinatura pedagógica; nunca substitui as regras de pré-requisito e revisão.
