# Estúdio local de conteúdo

## Objetivo confirmado

Criar um painel web local para um único administrador montar e ajustar o
catálogo do Prosa. Ele deve permitir escolher o tipo de atividade de cada
unidade, definir texto, respostas, alternativas, imagem, áudio e metadados,
pré-visualizar o resultado e publicar conteúdo que o aplicativo consiga usar
offline.

O motivo imediato é tornar a curadoria rápida e humana: por exemplo,
`UNIDADE` não é uma palavra adequada para apresentar a letra U. O painel não
substitui as regras pedagógicas; ele torna essas regras visíveis durante a
edição.

## Premissas e limites

- Uso somente em `localhost`, por um único administrador acadêmico.
- A primeira conta do painel é criada por uma tela local de configuração; as
  demais rotas administrativas exigem a sessão dessa conta.
- Imagens entram por arquivo, arrastar/soltar, colar ou URL. Uma URL é apenas
  uma fonte: o servidor baixa, valida e guarda uma cópia local.
- TTS é o áudio padrão; o modelo já reserva um arquivo de áudio próprio para
  expansão futura.
- Sem colaboração, multi-tenancy, publicação agendada, CDN ou geração de
  imagens nesta entrega.

## Decisões

| Decisão | Alternativas consideradas | Motivo |
| --- | --- | --- |
| Painel servido pelo próprio FastAPI | novo front-end web separado; editar Python | mantém a instalação local simples e dá uma interface real de curadoria |
| Conteúdo editável no banco após bootstrap | continuar a editar `content_data.py` | alterações pelo painel não podem ser sobrescritas por novo seed |
| Publicar somente catálogo validado | CRUD sem validação | evita bundle inválido, alternativas ambíguas e quebra de progresso |
| IDs técnicos imutáveis e aposentadoria | apagar ou reaproveitar itens | tentativas e estados de repetição referenciam itens e unidades |
| Mídia importada para armazenamento local | hotlink de URL | preserva uso offline e evita dependência de terceiros |

## Arquitetura escolhida

`/admin` entrega uma interface local com três áreas: trilhas/unidades,
editor guiado de atividade e prévia. O editor obtém tipos e propriedades do
contrato compartilhado, então o tipo selecionado decide quais campos são
necessários. Ele salva alterações no catálogo local, oferece validação do
bundle inteiro e só publica quando o lint API/mobile aceita o resultado.

Uma publicação é atômica: gera checksum, registra uma versão e atualiza o
bundle usado pelo aplicativo. O painel guarda um snapshot para restauração;
rollback republica um snapshot anterior, sem apagar tentativas. O seed segue
servindo para bootstrap e testes, mas deixa de sobrescrever um catálogo que o
administrador assumiu.

## Proteções de dados

- Upload e importação por URL aceitam apenas imagens, limitam tamanho e geram
  nome não controlado pelo cliente.
- A atividade pode ser desativada (`retired`), nunca apagada se houver
  histórico.
- Reordenar não altera IDs. Criar uma atividade gera UUID técnico.
- A validação usa o mesmo `content_lint` do bundle antes da publicação.
- Cada versão registra autor, data, nota e snapshot restaurável.

## Critérios de aceite

1. Um administrador local consegue entrar em `/admin` e editar a lição U.
2. Pode selecionar tipo, palavra, instrução, alternativas e TTS de uma
   atividade, pré-visualizar e salvar.
3. Pode importar imagem por arquivo ou URL, com cópia local e rótulo
   acessível.
4. Um catálogo inválido não publica; o erro indica o item e a regra.
5. Uma publicação muda o ETag de `/v1/content`, gera bundle válido e pode ser
   restaurada para a versão anterior.
6. Progresso e tentativas existentes não são apagados.

## Vocabulário e feedback do classificador (ADR 0005)

A aba **Vocabulário ML** lista palavras do banco com:

- dificuldade predita pelo modelo (`model_difficulty`);
- dificuldade atual usada no produto (`current_difficulty`);
- feedback humano: `pending` | `confirmed` | `corrected`.

Fluxo recomendado (human-in-the-loop):

1. adicionar palavra candidata → o modelo classifica;
2. humano **confirma** (rótulo positivo) ou **corrige** (rótulo ouro);
3. exportar rótulos confirmados/corrigidos e retreinar
   `python -m alfabetiza_ml.train_difficulty`.

Isso é o mecanismo correto de aprendizado supervisionado: o modelo propõe, a
pessoa especialista rotula, o treino seguinte usa esses rótulos.
