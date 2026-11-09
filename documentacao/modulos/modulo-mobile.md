# Módulo: Aplicativo móvel

> **Propósito:** descrever o aplicativo mobile do **Prosa** (offline-first, sessão, áudio e
> sincronização).

Raiz: [`apps/mobile/`](../../apps/mobile/).

Documentos relacionados: [Módulo: Sincronização](./modulo-sincronizacao.md) ·
[Módulo: Progresso e repetição espaçada](./modulo-progresso-repeticao-espacada.md) ·
[04 — Arquitetura](../04-arquitetura-prosa.md).

## Stack

Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3 · `expo-router` ~57 ·
`zustand` ^5 · `@tanstack/react-query` ^5 · `firebase` ^13 · `expo-sqlite` ·
`expo-secure-store` · `expo-speech` · `expo-auth-session` · `react-native-svg`.

## Funcionamento offline-first

- Catálogo embarcado em `assets/content/seed-bundle.json` (usado no primeiro boot offline);
  depois, `GET /v1/content` com `ETag`/`If-None-Match` guarda o bundle em SQLite
  (`content_bundle`), validado por `src/content/schema.ts` (espelho de `content_lint.py`).
- Sessão montada localmente; `POST /v1/ranking/next` é opcional com timeout curto — sem rede,
  a fila local vale.
- Eventos (`attempt`, `item_state`, `progress`) entram em fila SQLite; `syncNow()` em
  `use-sync.ts` faz push/pull e processa rejeições.

## Tela de sessão

- Ordem determinística (vencidos → fracos → novos → reserva), cotas `{due, weak, new}`,
  embaralhamento semeado; item errado reapresentado até 3 posições adiante.
- Áudio via `expo-speech`, usando `tts_fallback_text` do item (nunca a consoante isolada);
  `audio_repeats` conta acionamentos do botão de áudio.
- `time_to_first_interaction_ms` medido do render ao primeiro toque.

## Renderizadores de exercício

`choice`, `word_choices`, `order` cobrem os tipos de exercício do contrato
(`contracts/exercise-types.json`); um tipo sem renderizador não compila
(`components/exercises/registry.ts`).

## Autenticação

- Login/cadastro e refresh rotativo; tokens no `expo-secure-store`.
- Login social Google via `expo-auth-session`/Firebase (`/v1/auth/firebase`).
- Renovação automática do access token em `session-retry.ts`; encerra a sessão se o refresh
  for recusado.

## Configuração

`app.json` e `.env` carregam identificadores públicos (Firebase API key, client IDs do Google)
— ver [10 — Segurança](../10-seguranca.md) sobre a exposição em repositório.
