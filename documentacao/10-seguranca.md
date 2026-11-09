# Prosa — Segurança

> **Propósito:** documentar os mecanismos de autenticação, autorização e proteção de dados
> do **Prosa**, além dos riscos conhecidos.

Documentos relacionados: [07 — Referência da API](07-referencia-da-api.md) ·
[12 — Deploy](12-deploy.md) · [`docs/PRIVACY_AND_ACCESSIBILITY.md`](../docs/PRIVACY_AND_ACCESSIBILITY.md).

## Autenticação

- **Senhas:** armazenadas apenas pela API, com hash **Argon2id** (`apps/api/app/security.py`).
- **Tokens:** JWT HS256 com `sub` (user_id), `sid` (session_id), `type` (`access`/`refresh`),
  `jti` e `exp`.
  - Access token: curta duração (padrão 15 min).
  - Refresh token: rotativo; o hash do `jti` é armazenado em `auth_sessions.refresh_jti_hash`
    para permitir revogação.
- **Sessão:** `deps.py` valida que a sessão não está revogada e pertence ao usuário.
- **Login social (Google/Firebase):** `POST /v1/auth/firebase` valida assinatura, emissor,
  audiência (projeto) e **exige e-mail verificado** (`apps/api/app/firebase.py`).

## Autorização

- Endpoints de aprendizagem exigem `current_user` (bearer).
- Endpoints administrativos exigem `is_admin` (a conta do Estúdio), retornando `403` caso
  contrário (`apps/api/app/admin.py` e `word_studio.py`).
- **Isolamento de usuários:** todas as consultas de dados são filtradas por `user_id`.
- **Estúdio local:** a primeira conta admin é criada por uma tela local de setup; as demais
  rotas exigem sessão dessa conta. É projetado para `localhost`, sem multi-tenancy.

## Proteção de dados

- **Consentimento de pesquisa** separado do cadastro (`users.research_consent`), com data e
  opção de retirada; só tentativas de quem consentiu entram no treino do ranking (ADR 0004).
- **Sem áudio/imagem de usuários:** os payloads de sync usam `extra="forbid"`; a rejeição de
  campos extras impede o envio acidental de imagens brutas.
- **Dados coletados:** conta, progresso, respostas e duração — o mínimo para a continuidade
  da aprendizagem.
- **Tokens no dispositivo:** `expo-secure-store`; senhas nunca ficam no cliente.

## Proteções no Estúdio (importação de imagem)

- Upload/URL aceitam apenas JPEG, PNG, WebP ou SVG, com limite de 5 MB e nome gerado no
  servidor (não controlado pelo cliente).
- Importação por URL faz validação anti-SSRF: recusa hosts privados/locais e **redirecionamentos**
  (que poderiam levar a uma rede interna).
- Mídia fica em `apps/api/app/data/media/` (ignorada pelo Git).

## Configuração em produção

- `JWT_SECRET` e `POSTGRES_PASSWORD` devem ser gerados com fonte criptograficamente segura e
  **nunca** versionados. `config.py` recusa `JWT_SECRET` com `change-me` em produção.
- Cabeçalhos de segurança no Caddy: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, remoção de `Server`.
- Somente o proxy publica portas; banco e API ficam na rede interna do Compose.
- `security_opt: [no-new-privileges:true]` nos serviços.

## Riscos conhecidos e pendências

| Risco / pendência | Severidade | Nota |
|---|---|---|
| `apps/api/.env` e `app.json` versionados com chaves reais (Firebase API key, Google client IDs) | Média | Verificar se os segredos de produção são rotacionáveis; chaves de client Firebase/Google são públicas por natureza, mas devem ser revistas. |
| `npm audit` registra 13 vulnerabilidades moderadas em dependências transitivas do Expo | Média | Correção exige versões incompatíveis; reavaliar na próxima atualização do SDK (ver `VALIDATION_REPORT.md`). |
| Validação TalkBack/VoiceOver e contraste em dispositivo físico | Baixa/Média | Pendente de hardware e revisão humana. |
| `RANKING_MODEL_ENABLED` desligado por padrão | — | Comportamento intencional (gate de promoção ainda não assinado). |
| Estúdio restrito a `localhost` | Baixa | Sem autenticação multifator; adequado ao uso acadêmico local. |

## Práticas de logs

- Logs não devem conter senha, token, áudio, e-mail completo ou dado pessoal desnecessário.
- O push registra apenas IDs e motivos de rejeição (`rejected_event <id>: <motivo>`).
