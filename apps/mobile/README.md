# Alfabetiza Mobile

Aplicativo Expo/React Native do MVP. Inclui a trilha fônica de 26 letras, a trilha temática «Tem em casa», nove tipos de exercício de letra, sílaba, palavra e frase (três renderizadores em `src/components/exercises`), SQLite offline, fila idempotente de sincronização, áudio por texto para fala e tokens no SecureStore. A lição monta uma sessão por unidade (`src/domain/session.ts`): itens vencidos e fracos primeiro, novos na ordem do currículo, e o item errado volta na mesma sessão; o estado por item (`src/domain/scheduler.ts`) define quando cada atividade vence.

O catálogo vem da API (`GET /v1/content`, com `ETag`) e fica em cache no SQLite. `assets/content/seed-bundle.json` é o conteúdo embarcado para o primeiro boot sem rede; ele é gerado por `apps/api/scripts/export_content_bundle.py` e não deve ser editado à mão. Um bundle que não passe em `src/content/schema.ts` é descartado sem afetar o conteúdo em uso.

## Executar

```powershell
npm install
npm test
npm run typecheck
npm run lint
npm run android
```

Defina `expo.extra.apiUrl` em `app.json` para a API acessível pelo dispositivo. O primeiro login será integrado à API; a sessão local já usa `expo-secure-store`.

## Limite conhecido

A etapa atual não solicita escrita manuscrita, traçado ou classificação de escrita. O fluxo validado trabalha com imagens, áudio e inserção por toque da letra na palavra escolhida. Nenhum classificador é executado durante as lições.

As instruções são lidas pelo mecanismo de texto para voz do dispositivo, em português do Brasil. O aplicativo envia ao TTS exatamente o enunciado exibido na atividade, evitando arquivos de áudio duplicados e mantendo texto e fala sincronizados. A disponibilidade e a voz podem variar conforme o sistema e os pacotes de voz instalados no aparelho.
