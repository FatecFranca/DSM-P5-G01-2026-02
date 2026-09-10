# Alfabetiza Mobile

Aplicativo Expo/React Native do MVP. Inclui 26 letras, quatro tipos de exercício — ouvir e escolher, reconhecer a letra, localizar a letra em uma palavra e completar palavras com uma lacuna —, SQLite offline, fila idempotente de sincronização, áudio por texto para fala e tokens no SecureStore.

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
