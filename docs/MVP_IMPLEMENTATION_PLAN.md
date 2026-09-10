<!-- markdownlint-disable MD013 -->

# Alfabetiza — plano de implementação do MVP

## Objetivo

Levar o Alfabetiza do repositório vazio a um MVP mobile estruturado, seguindo o [documento-base do projeto](./PROJECT_FOUNDATION.md), com API própria em Python, funcionamento offline, sincronização online, classificação local da escrita e hospedagem na VPS Azure.

## Arquitetura definida

- **Mobile:** React Native, TypeScript, Expo Router, Zustand e TanStack Query.
- **Persistência local:** `expo-sqlite` para conteúdo, sessão, tentativas, progresso e fila de sincronização; `expo-secure-store` para tokens.
- **Áudio:** `expo-audio` com arquivos pré-gravados incluídos no aplicativo e botão de repetição.
- **API:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy 2 e Alembic.
- **Autenticação:** JWT de curta duração, refresh token rotativo e senhas protegidas com Argon2id.
- **Banco:** PostgreSQL.
- **Machine Learning:** Python, pandas, NumPy, scikit-learn e ONNX Runtime.
- **Inferência local:** modelo ONNX executado no dispositivo com `onnxruntime-react-native`.
- **Infraestrutura:** Docker Compose, proxy HTTPS, API e PostgreSQL na VPS Azure.

A API e o pipeline de ML serão projetos Python separados. A imagem de produção da API não deve carregar dependências pesadas de treinamento.

## Etapas de implementação

### 1. Formalizar o contrato do MVP

- Revisar objetivos, sequência, linguagem, privacidade e critérios com o integrante capacitado do grupo.
- Fixar as 26 letras do alfabeto apresentadas progressivamente.
- Definir letras maiúsculas de forma como primeiro formato.
- Selecionar sílabas e 4 a 8 palavras contextualizadas.
- Confirmar os três tipos de exercício: ouvir e escolher, reconhecer letra e escrever letra.

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
- Produzir ou selecionar áudios com licença definida.
- Incluir os arquivos essenciais no aplicativo para uso offline.
- Adicionar repetição de todas as instruções.

**Verificação:** validador confirma as 26 letras, exercícios completos, mídias existentes e reprodução local.

### 4. Construir o pipeline de Machine Learning

- Preparar o dataset e o pré-processamento de orientação, escala, centralização, espessura e fundo.
- Separar treinamento e teste por escritor, evitando vazamento de amostras.
- Treinar modelo baseline e modelo ajustado com amostras do grupo.
- Medir accuracy, precision, recall, F1 macro, matriz de confusão, latência e tamanho.
- Exportar modelo ONNX com classe, confiança, estado de incerteza e versão.

**Verificação:** treinamento reproduzível em Python e modelo pronto para inferência no dispositivo.

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

Implementar sessão de estudo, instrução, áudio, exercício de escolha, área de escrita, inferência local, feedback de confiança e persistência local.

Contrato da inferência:

```ts
type InferenceResult = {
  className: string;
  confidence: number;
  uncertain: boolean;
  modelVersion: string;
};
```

Baixa confiança deve gerar nova tentativa ou orientação, nunca uma mensagem constrangedora.

**Verificação:** uma pessoa inicia uma lição, ouve, escreve, recebe feedback, fecha e reabre o aplicativo vendo o resultado salvo.

### 7. Implementar sincronização offline/online

- Criar banco SQLite local para conteúdo, sessão, tentativas, progresso e fila de saída.
- Implementar envio em lote, retry, backoff e cursor de sincronização.
- Processar eventos no servidor de forma idempotente.
- Definir resolução determinística para conflitos de progresso.
- Não enviar nem armazenar imagem bruta da escrita por padrão.

**Verificação:** concluir atividades sem internet, reconectar e confirmar sincronização única, sem perda ou duplicação.

### 8. Expandir para o MVP pedagógico completo

- Adicionar as 26 letras progressivas.
- Completar os três tipos de exercício.
- Adicionar histórico de tentativas e progresso por lição.
- Adicionar sílabas e 4 a 8 palavras.
- Implementar o Classificador A para dificuldade das palavras, inicialmente com regra pedagógica de bootstrap.
- Preparar o Classificador B para recomendação de atividade após coleta de dados reais.
- Usar fallback baseado em regras enquanto não houver dados suficientes.

**Verificação:** conjunto de teste separado, F1 macro calculado e nenhuma versão promovida sem avaliação.

### 9. Preparar Azure, segurança e acessibilidade

- Provisionar VPS Ubuntu com Docker Compose, firewall e HTTPS.
- Configurar volumes persistentes, backups e restauração testada.
- Configurar logs sem dados pessoais ou conteúdo de escrita.
- Revisar contraste, tamanho dos botões, leitor de tela, rótulos, linguagem, consentimento e retenção.
- Configurar health check e reinício seguro dos serviços.

**Verificação:** API acessível por HTTPS, backup restaurável, secrets fora do Git e checklist de acessibilidade concluído.

### 10. Executar a verificação final

- Executar testes unitários, integração, mobile, API e ML.
- Validar o fluxo em dispositivo físico Android.
- Realizar smoke test iOS quando houver ambiente de build disponível.
- Executar lint, typecheck, build, avaliação dos modelos e `git diff --check`.
- Registrar limitações, métricas e evidências no relatório do projeto.

**Critério final:** o MVP funciona offline, sincroniza com a API na VPS Azure, cobre as 26 letras progressivamente, classifica escrita localmente, registra progresso e apresenta métricas documentadas.

## Dependências críticas

```text
contrato pedagógico
        ↓
prova de ML ───────────────┐
        ↓                  │
primeira fatia vertical   │
        ↓                  │
API + persistência + sync │
        ↓                  │
MVP pedagógico completo   │
        ↓                  │
avaliação e deploy ───────┘
```

O Classificador B e o retreino baseado em uso não devem bloquear a primeira fatia funcional.

## Testes e critérios de aceite

- **API:** autenticação, autorização, validação, migrations, isolamento e idempotência.
- **Mobile:** navegação, áudio, escrita, inferência, persistência, modo offline e feedback de incerteza.
- **Machine Learning:** F1 macro, matriz de confusão, latência, tamanho e teste por escritor.
- **Sincronização:** reenvio seguro, perda de conexão, retry e ausência de duplicação.
- **Infraestrutura:** HTTPS, reinício dos containers, backup e restauração.
- **Produto:** conclusão da primeira lição, evolução entre pré-teste e pós-teste e clareza percebida pelos participantes.

## Premissas e limites

- Android será o primeiro dispositivo de validação; a arquitetura continuará multiplataforma.
- A VPS Azure terá aproximadamente 4 vCPU, 8 GB de RAM e 80 GB SSD.
- O primeiro login ocorrerá online; depois disso, as sessões poderão continuar offline.
- Imagens brutas de escrita não serão armazenadas por padrão.
- Testes com usuários reais dependem de consentimento e autorização do grupo.
- O plano não adiciona funcionalidades fora do escopo documentado em `PROJECT_FOUNDATION.md`.
