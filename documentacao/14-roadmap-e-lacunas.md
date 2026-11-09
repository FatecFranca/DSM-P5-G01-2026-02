# Prosa — Roadmap e lacunas

> **Propósito:** comparar a proposta com a implementação e listar a dívida técnica e os
> próximos passos do **Prosa**.

Documentos relacionados: [01 — Visão geral](01-visao-geral-prosa.md) ·
[02 — Requisitos](02-requisitos-prosa.md) · [`docs/VALIDATION_REPORT.md`](../docs/VALIDATION_REPORT.md).

## Proposta × implementação

| Item da proposta | Status | Observação |
|---|---|---|
| Sessão de estudo com áudio e repetição | ✅ | TTS (`expo-speech`), botão de repetir |
| 26 letras progressivas em 3 fases | ✅ | ordem fixada em `contracts/pedagogy.json` |
| 3 tipos de exercício do MVP | ✅ (ampliado) | evoluíram para 16 tipos |
| 8–12 palavras contextualizadas por trilha | ✅ | `Tem em casa` com 9 palavras; `Família` inicial |
| Trilhas de cotidiano | 🟡 | `Tem em casa` e `Família` declaradas; 6 trilhas restantes não curadas |
| Progresso por lição + histórico | ✅ | progresso derivado do estado por item |
| Áudio pré-gravado/gerado de forma controlada | 🟡 | TTS como padrão; `assets.audio_kind` reservado para áudio gravado |
| Funcionamento offline | ✅ | SQLite + bundle semente |
| Sincronização sem duplicação | ✅ | idempotência + rejeição por evento |
| Ranking social | ⚠️ | Fora do MVP na proposta; **implementado** como placar/ligas (`leaderboard.py`), distinto do ranking de itens |
| Painel de professor | 🟡 | Existe o **Estúdio de conteúdo** (administrador), não um painel de professor |
| Modelos estatísticos de dificuldade/recomendação | ✅ (condicionado) | ranking (ADR 0004) e classificador lexical (ADR 0005), desligados até gate/promoção |
| Escrita manuscrita / traçado | ❌ (fora de escopo) | legado em `ml/legacy/handwriting`, não usado no produto |

## Dívida técnica

| Item | Descrição |
|---|---|
| 13 vulnerabilidades `npm audit` | Dependências transitivas do Expo; correção exige upgrade destrutivo. |
| Renderer `word_choices` | Definido em `content_types.py` mas não usado em `RENDERER_OF` nem no contrato (`renderers` lista `choice/order/multi_select`). |
| `apps/api/.env` e `app.json` com chaves | Chaves Firebase/Google versionadas; revisar política de segredos. |
| Downgrade lossy | `20260916_content_model.py` perde metadados novos ao reverter. |
| Sem CI/CD | Validação manual; ausência de pipeline automatizado. |

## Lacunas e pendências (evidências externas)

- Aprovação da sequência, voz e linguagem pelo integrante capacitado do grupo.
- Teste em Android físico (TalkBack) e smoke test iOS (VoiceOver).
- Avaliação com amostras reais consentidas e comparação pré-teste/pós-teste.
- Implantação na VPS autorizada, DNS/HTTPS público e restauração remota testada.
- Curadoria das trilhas restantes (`Esporte`, `Trabalho`, `Saúde`, `Transporte`,
  `Compras`, `Documentos`).

## Próximos passos sugeridos

1. Assinar a revisão pedagógica pendente (ADR 0004) para decidir sobre o modelo de ranking.
2. Curar as trilhas temáticas restantes.
3. Migrar áudio gravado para `assets` (com `tts_fallback_text` como reserva).
4. Adicionar CI/CD com validação automatizada (testes, lint, typecheck, `git diff --check`).
5. Reavaliar as dependências vulneráveis na próxima atualização do SDK Expo.
6. Consolidar o renderer `word_choices` ou removê-lo do enum para evitar divergência.
