# Prosa — Glossário

> **Propósito:** definir os termos de domínio e siglas usados no **Prosa**, para manter
> consistência entre código, documentos e conversas.

## Termos de domínio

| Termo | Definição |
|---|---|
| **Prosa** | Nome do sistema: aplicativo de apoio à alfabetização inicial de jovens e adultos. |
| **Trilha** | Agrupamento temático ou fônico de unidades (`tracks`). Nunca libera conteúdo. |
| **Trilha fônica** | Trilha `kind=phonics` com as 26 letras em ordem progressiva (ID `alphabet`). |
| **Trilha temática** | Trilha `kind=theme` de vocabulário cotidiano (ex.: `Tem em casa`, `Família`). |
| **Unidade** | `units` — lição de letra, palavra ou frase dentro de uma trilha. |
| **Item** | `items` — atividade/exercício individual dentro de uma unidade. |
| **Exercício** | Sinônimo prático de item (atividade de letra, sílaba, palavra ou frase). |
| **Portão pedagógico** | `required_letters` de unidade/item: só libera quando todas as letras foram dominadas. |
| **Ordem de aprendizagem** | `AEIOUMLPSTRNDCGBFVHQJKZXWY` (`learning_order`). |
| **Fase** | Agrupamento da trilha fônica: Vogais, Consoantes de alta utilidade, Ampliação do vocabulário. |
| **Sílabas** | `syllables` — unidade audível; padrão silábico (`V`, `CV`, `CVC`, `CCV`, etc.). |
| **Palavra** | `words` — vocabulário curado ou candidato. |
| **Frase** | `sentences` — frases curtas de trilha temática. |
| **Estado por item** | `item_states` — repetição espaçada por item (força, meia-vida, vencimento). |
| **Progresso** | `progress` — resumo por unidade derivado dos estados por item. |
| **Tentativa** | `attempts` — resposta do aprendiz a um item, com contexto de sessão. |
| **Repetição espaçada** | Algoritmo de revisão: `half_life = clamp(4h × 2^strength, 4h, 90d)`. |
| **Ranking** | `ranking` — ordenação de itens elegíveis por regras e/ou modelo (ADR 0004). |
| **Placar / ligas** | `leaderboard` — pontos e ligas entre aprendizes (distinto do ranking de itens). |
| **Estúdio de conteúdo** | Painel `/admin` para curadoria local do catálogo. |
| **Word bank** | Banco de candidatos gerado do Corpus SANTOS TONI (`word_bank.json`). |
| **Bundle semente** | `seed-bundle.json` — catálogo embarcado para o primeiro boot offline. |
| **Consentimento de pesquisa** | `users.research_consent` — autorização separada para uso de tentativas em treino. |
| **Sincronização** | `sync` — push/pull idempotente de eventos entre app e API. |
| **Review status** | Ciclo de revisão: `candidate`, `pending`, `approved`, `rejected`, `retired`. |

## Tipos de exercício (`contracts/exercise-types.json`)

| Tipo | Alvo | Descrição |
|---|---|---|
| `listen_choose` | letra | Ouvir o nome da letra e escolhê-la. |
| `recognize_letter` | letra | Encontrar a letra entre opções visuais. |
| `find_in_word` | letra | Localizar a posição da letra em uma palavra. |
| `initial_sound` | letra | Relacionar som inicial à letra. |
| `find_all_in_word` | letra | Tocar todas as ocorrências da letra. |
| `compare_words` | letra | Comparar duas palavras e identificar a letra que mudou. |
| `mixed_review` | letra | Revisar a letra em nova palavra. |
| `syllable_listen_choose` | sílaba | Ouvir a sílaba e escolhê-la. |
| `complete_word` | letra | Completar a lacuna da palavra. |
| `word_listen_choose` | palavra | Ouvir e escolher a palavra. |
| `word_from_syllables` | palavra | Montar a palavra com sílabas. |
| `sentence_fill_word` | frase | Completar a lacuna da frase. |
| `sentence_order` | frase | Ordenar palavras para formar a frase. |
| `syllable_position_choose` | sílaba | Identificar sílaba inicial/final de palavra ilustrada. |
| `word_image_choose` | palavra | Escolher a palavra correspondente à imagem. |
| `sentence_image_choose` | frase | Escolher a frase correspondente à cena. |

## Siglas e abreviaturas

| Sigla | Significado |
|---|---|
| API | Application Programming Interface |
| ADR | Architecture Decision Record |
| MVP | Minimum Viable Product |
| ML | Machine Learning |
| TTS | Text-to-Speech (síntese de voz) |
| JWT | JSON Web Token |
| ORM | Object-Relational Mapping |
| ETag | Entity Tag (validação condicional de cache) |
| ECE | Expected Calibration Error |
| AUC | Area Under the ROC Curve |
| PII | Personally Identifiable Information |
| SSRF | Server-Side Request Forgery |
| CV | Consoante-Vogal (padrão silábico) |
| CVC | Consoante-Vogal-Consoante (padrão silábico) |
