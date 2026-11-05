# Prosa — Requisitos

> **Propósito:** consolidar os requisitos funcionais (RF) e não funcionais (RNF) do
> **Prosa**, com o status de implementação verificado no código em 2026-11-04.

Documentos relacionados: [01 — Visão geral](01-visao-geral-prosa.md) ·
[14 — Roadmap e lacunas](14-roadmap-e-lacunas.md) · [03 — Histórias de usuário](03-historias-de-usuario.md).

Status: ✅ implementado · 🟡 parcial · ❌ não implementado.

## Requisitos funcionais

| ID | Requisito | Status | Onde está implementado |
|---|---|---|---|
| RF-01 | Cadastrar conta com e-mail e senha | ✅ | `apps/api/app/auth.py` → `POST /v1/auth/register` |
| RF-02 | Entrar (login) com e-mail e senha | ✅ | `POST /v1/auth/login` |
| RF-03 | Rotacionar refresh token | ✅ | `POST /v1/auth/refresh` (JTI hash em `auth_sessions`) |
| RF-04 | Encerrar sessão (logout) | ✅ | `POST /v1/auth/logout` |
| RF-05 | Login social com Google (Firebase Auth) | ✅ | `POST /v1/auth/firebase`; migration `20261022_google_login` |
| RF-06 | Obter catálogo de conteúdo com `ETag`/`304` | ✅ | `apps/api/app/content.py` → `GET /v1/content` |
| RF-07 | Reproduzir e repetir instruções de áudio | ✅ | `expo-speech` + `tts_fallback_text`; `apps/mobile/src/components/AudioButton.tsx` |
| RF-08 | Executar exercícios de letra (ouvir/escolher, reconhecer, localizar, som inicial, caça, comparação, completar, revisão) | ✅ | 7 habilidades-base por letra em `apps/api/app/seed.py` |
| RF-09 | Executar exercícios de sílaba, palavra e frase | ✅ | tipos em `contracts/exercise-types.json` |
| RF-10 | Registrar tentativas com contexto de sessão | ✅ | `apps/api/app/sync.py` → evento `attempt` |
| RF-11 | Registrar progresso e estado por item | ✅ | evento `item_state` + `progress`; `apps/mobile/src/domain/scheduler.ts` |
| RF-12 | Continuar sessão básica sem internet | ✅ | `expo-sqlite` + `seed-bundle.json` |
| RF-13 | Sincronizar sem duplicação (idempotência) | ✅ | `client_event_id`/`client_attempt_id`; `POST /v1/sync/push` |
| RF-14 | Rejeitar eventos desconhecidos sem travar o lote | ✅ | `rejections` com motivo no push |
| RF-15 | Reiniciar atividade sem punição | ✅ | feedback de nova tentativa; reapresentação de erro |
| RF-16 | Repetição espaçada por item | ✅ | `apps/mobile/src/domain/scheduler.ts` (ADR 0003) |
| RF-17 | Ranking de itens no servidor (opcional, desligado) | ✅ | `POST /v1/ranking/next` (ADR 0004) |
| RF-18 | Placar e ligas entre aprendizes | ✅ | `apps/api/app/leaderboard.py` |
| RF-19 | Consentimento de pesquisa separado do cadastro | ✅ | `PUT /v1/me/research-consent` |
| RF-20 | Estúdio local de conteúdo (curadoria por administrador) | ✅ | `apps/api/app/admin.py` + `/admin` |
| RF-21 | Classificador de dificuldade lexical + feedback humano | ✅ | `apps/api/app/word_studio.py` (ADR 0005) |
| RF-22 | Trilha temática «Tem em casa» com palavras e frases | ✅ | `apps/api/app/content_data.py` (`TRACKS`) |
| RF-23 | Trilha «Família» (conteúdo inicial) | 🟡 | palavras declaradas, pendentes de revisão |
| RF-24 | Nivelamento inicial por toque | ✅ | `apps/mobile/app/placement.tsx` |
| RF-25 | Progresso por lição e histórico de tentativas | ✅ | `GET /v1/progress`, `GET /v1/attempts` |

## Requisitos não funcionais

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RNF-01 | Botões grandes, alto contraste, textos curtos | ✅ | tema em `apps/mobile/src/theme.ts` |
| RNF-02 | Toda ação crítica com rótulo e/ou áudio | ✅ | componentes com `accessibilityLabel` |
| RNF-03 | Suporte a leitor de tela quando aplicável | 🟡 | marcação presente; validação TalkBack pendente |
| RNF-04 | Resposta local em tempo aceitável | ✅ | sessão local + ranking com limite de latência (50 ms) |
| RNF-05 | Armazenamento seguro de sessão e senhas | ✅ | `expo-secure-store` + Argon2id |
| RNF-06 | Logs sem conteúdo pessoal desnecessário | ✅ | ver `apps/api/app/sync.py` (log de IDs, não de conteúdo) |
| RNF-07 | Tratamento de erro sem linguagem constrangedora | ✅ | feedback pedagógico em `content_lint.py` |
| RNF-08 | Isolamento entre usuários | ✅ | consultas filtradas por `user_id` |
| RNF-09 | Idempotência de sincronização | ✅ | unicidade `(user_id, client_event_id)` e `(user_id, client_attempt_id)` |
| RNF-10 | Acessibilidade medida em dispositivo físico | ❌ | dependente de hardware (TalkBack/VoiceOver) |
| RNF-11 | Contraste medido nas configurações finais | ❌ | pendente (ver `PRIVACY_AND_ACCESSIBILITY.md`) |

## Regras de negócio

- **Portão pedagógico:** um item/unidade só é elegível quando todas as suas
  `required_letters` já foram apresentadas/dominadas. A trilha nunca libera conteúdo
  (ADR 0002).
- **Ordem de aprendizagem:** `AEIOUMLPSTRNDCGBFVHQJKZXWY`, em três fases (vogais,
  consoantes de alta utilidade, ampliação do vocabulário).
- **Repetição espaçada:** acerto soma `strength`; erro subtrai 2 (mínimo 0);
  `half_life = clamp(4h × 2^strength, 4h, 90d)` (ADR 0003).
- **Reapresentação de erro:** o item errado volta à sessão em até três posições.
- **Progresso derivado:** a unidade é concluída quando todos os itens foram acertados no
  último encontro; pede revisão quando algum item venceu.
- **Conteúdo curado:** candidatos do corpus entram como `candidate` e nunca geram
  exercício; só `content_data.py` publica (ADR 0002/0005).
- **Feedback:** acerto confirma; erro oferece nova tentativa e explicação curta, sem
  punição.

## Fontes

- [`docs/PROJECT_FOUNDATION.md`](../docs/PROJECT_FOUNDATION.md) — requisitos essenciais.
- [`docs/PEDAGOGICAL_CONTRACT.md`](../docs/PEDAGOGICAL_CONTRACT.md) — regras pedagógicas.
- [`contracts/pedagogy.json`](../contracts/pedagogy.json) — invariantes validadas.
