# ADR 0002 — Modelo de conteúdo: trilhas temáticas, sílabas e frases

Data: 16 de setembro de 2026. Status: aceito.

## Contexto

O produto quer trilhas de cotidiano ("Tem em casa", "Família", "Trabalho"…) com progressão letras → sílabas → palavras → frases. O modelo anterior tinha só `modules → lessons → exercises` para 26 letras, sem sílaba, frase, trilha ou metadados de curadoria, e o app só tinha renderizador para exercícios de letra.

Uma palavra de "Trabalho" pode exigir letras ainda não apresentadas. Se a trilha liberasse conteúdo, o contrato pedagógico (`PEDAGOGICAL_CONTRACT.md`: palavras só quando todas as letras já foram apresentadas) vazaria por ela.

## Decisão

1. **Dois eixos independentes.** O portão é `required_letters` de cada unidade/item: um item só é elegível quando todas as suas letras estão dominadas (`isLessonUnlocked` no app opera sobre `prerequisiteLetters`, que é exatamente `required_letters`). A trilha é só agrupamento, ordem sugerida e prioridade de sessão; **nunca libera nada**. Uma trilha aparece com as unidades bloqueadas até as letras chegarem. A flag `sight_word` (reconhecimento global antes das letras) fica **fora** deste corte.
2. **Esquema.** `modules → tracks` (`slug`, `kind` phonics|theme, `review_status`, `version`), `lessons → units` (`kind` letter|word|sentence, `focus_letter`, `required_letters`), `exercises → items` (`item_kind`, `target_id`, `payload`, `required_letters`, `tts_fallback_text`, `review_status`). Novas: `syllables`, `sentences`, `word_tracks`, `content_reviews`, `assets`, `content_versions`. `words.syllables` vira lista JSON e ganha os metadados de `CONTENT_CATALOG_STRATEGY.md` (frequência e fonte, justificativa de dificuldade, imagem/rótulo/áudio, regionalismo, licença, status de revisão, versão). `progress.unit_id` e `attempts.item_id` passam a ser chaves estrangeiras reais; a migration remove antes as linhas órfãs, que eram inutilizáveis.
3. **Itens nunca são apagados**, só `retired`: tentativas e progresso os referenciam. O seed é declarativo (`content_data.py`) e idempotente.
4. **Banco de candidatos.** `app/data/word_bank.json` (1200 palavras do Corpus SANTOS TONI, gerado por `scripts/build_word_bank.py`) entra em `words` com `review_status = candidate` e `frequency_source = corpus-santos-toni`. Candidatas **não saem no bundle nem geram exercício**; só palavras curadas em `content_data.py` (`pending`/`approved`) são publicadas, e a frequência do corpus as enriquece quando existe.
5. **Tipos novos**, em `contracts/exercise-types.json` com `target` e `renderer`: `syllable_listen_choose`, `word_listen_choose`, `word_from_syllables`, `sentence_fill_word`, `sentence_order`. Três renderizadores no app (`choice`, `word_choices`, `order`) cobrem os nove tipos; um tipo sem renderizador não compila (`components/exercises/registry.ts`).
6. **Sílaba como unidade audível.** `expo-speech` não expõe SSML; ler o nome da letra ("eme") no lugar do fonema é o método falhando. Cada item tem `tts_fallback_text`: nos itens de sílaba, palavra e frase é o próprio alvo ("MA", "CASA", "EU DURMO NA CAMA"), nunca a consoante isolada. `syllable_listen_choose` existe só para consoantes com padrão CV regular (`MLPSTRNDCGBFVZJ`). Áudio gravado por sílaba/palavra entra depois via `assets` (`audio_kind`), com `tts_fallback_text` como reserva.
7. **Contrato de sync** passa a usar `unit_id`/`item_id`; `lesson_id`/`exercise_id` são aceitos como aliases por uma release. Itens desconhecidos são rejeitados com 422 em vez de gravados como órfãos.

## Entregue neste corte

Esquema completo e migration testada em ida-e-volta; trilha fônica com sílaba por consoante; **uma** trilha temática ("Tem em casa": 9 palavras, 5 frases, 3 unidades) marcada `pending` até revisão pedagógica. Curar as outras sete trilhas é trabalho humano, não de código.

## Consequências

- Conteúdo temático cresce sem build e sem tocar no portão pedagógico.
- Tentativas referenciam itens reais de qualquer tipo, com `exercise_type` e `unit_id` — a base do motor por item (ADR 0003) e do ranking (ADR 0004).
- `downgrade` da migration é lossy para metadados novos e para unidades temáticas.
