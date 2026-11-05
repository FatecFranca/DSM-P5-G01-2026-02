# Módulo: Placar e ligas

> **Propósito:** descrever o placar entre aprendizes do **Prosa** (pontos por tentativa e
> ligas do "caminho da leitura").

Arquivo: [`apps/api/app/leaderboard.py`](../../apps/api/app/leaderboard.py) ·
regra espelhada em [`apps/mobile/src/domain/points.ts`](../../apps/mobile/src/domain/points.ts).

Documentos relacionados: [07 — Referência da API](../07-referencia-da-api.md) ·
[Módulo: Ranking](./modulo-ranking.md) (não confundir: o ranking ordena itens; aqui é placar
entre pessoas).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/v1/leaderboard/me` | pontos e posição de quem chama |
| GET | `/v1/leaderboard?limit=` | topo do placar + linha de quem chama |
| GET | `/v1/leaderboard/league?limit=` | liga de quem chama e placar da semana |

## Pontos

- `POINTS_FIRST_TRY = 3`, `POINTS_RECOVERED = 1`.
- Tentativas agrupadas por `(session_id, item_id)`; acerto na primeira apresentação vale 3,
  acerto após erro vale 1; grupo sem acerto vale 0; errar nunca tira pontos.
- Tentativas sem sessão (clientes anteriores à ADR 0003) contam sozinhas.
- `public_name` expõe só o primeiro nome (ou começo do e-mail).

## Ligas

Caminho da leitura (lápis → biblioteca); a pessoa entra pela **soma de todos os pontos** e só
sobe (nunca cai, para não punir quem fica dias sem praticar):

| id | Nome | Mínimo |
|---|---|---|
| `lapis` | Lápis | 0 |
| `caderno` | Caderno | 150 |
| `livro` | Livro | 400 |
| `estante` | Estante | 800 |
| `biblioteca` | Biblioteca | 1500 |

Dentro da liga, o placar é dos **pontos da semana**, que zera na segunda às 00h de Brasília
(sem horário de verão desde 2019). Administradores ficam fora do placar, mas veem o lugar que
teriam.
