# ADR 0006 — Nivelamento inicial com nível de partida, crédito de letras e mistura de dificuldade

- Status: aceito (pendente de validação pedagógica no piloto)
- Data: 2026-11-10

## Contexto

O app tinha um nivelamento de quatro perguntas, uma por nível, que parava no primeiro erro. O nível sugerido era gravado e nunca lido, e o portão por letras mantinha qualquer pessoa presa às 26 lições de letras antes de chegar às palavras e frases.

A curadoria propôs um quiz de 12 itens (`bancoquestoesequiz/QUIZ_NIVELAMENTO.md`): quatro fáceis, quatro médios e quatro difíceis. Uma faixa é atingida com 3 acertos em 4, e o resultado é uma dificuldade predominante com uma mistura de exercícios (6-3-1, 3-5-2 ou 2-3-5). Esse quiz vivia só num esquema PostgreSQL paralelo, que o app offline não lê.

## Decisão

1. **Fonte única.** `contracts/placement-quiz.json` guarda os itens, a regra e exemplos com resultado esperado. O app (`src/domain/placement.ts`), a API (`app/placement.py`) e a carga PostgreSQL (`quiz_nivelamento.sql`, gerado) corrigem com a mesma regra. Os testes de cada lado rodam os exemplos do contrato.
2. **Dificuldade e nível.** A dificuldade segue a regra da curadoria. Cada item mede também um nível do Prosa:
   - Letras: F1 e F2.
   - Sílabas: F3, M1, M2 e D1.
   - Palavras: F4 e M3.
   - Frases: M4, D2, D3 e D4.

   O nível de partida é o maior nível em que ele e os anteriores atingem o mínimo de acertos, limitado pela dificuldade: fácil fica em 1, médio vai até 3 e difícil até 4.
3. **Crédito de letras.** A partir do nível 2, as letras das fases 1 e 2 contam como apresentadas no portão pedagógico. No nível 4, contam também as da fase 3. O crédito abre unidades, mas não conclui lições, não gera progresso e não dá conquistas. Resultado provisório (quiz pulado, incompleto, com poucas fáceis respondidas ou com resultado contrastante) nunca dá crédito.
4. **Trilha.** A próxima lição sugerida começa pelas unidades do nível de partida em diante. Quando elas acabam, a sugestão volta à ordem pedagógica.
5. **Mistura.** Na sessão, só os itens ainda não vistos são reordenados pela mistura da faixa. A apresentação da letra continua sempre primeiro, e vencidos e fracos continuam na frente. A faixa de cada exercício vem de `payload.difficulty`:
   - `introducao` e `facil` contam como fácil;
   - `medio` e `revisao` contam como médio;
   - `desafio` conta como difícil.
6. **Registro.** O app guarda só as respostas brutas e sincroniza o evento `placement`. A API recalcula e guarda o resultado em `placement_results`. Refazer o quiz pelo Perfil substitui o resultado anterior (o mais recente vence), sem tirar pontos já ganhos.
7. **Aplicação.** O quiz abre com uma demonstração sem pontuação. Depois vem uma questão por tela: tocar marca a opção e CONFIRMAR envia. Pular uma questão também é registrado. Nada indica certo ou errado durante o quiz. O áudio lê a instrução e os estímulos de escuta, nunca o texto avaliado. A ordem das opções é fixa, com o gabarito balanceado em quatro por posição, para que os resultados do piloto sejam comparáveis.

## Consequências

- O contrato pedagógico passa a admitir que o nivelamento abra unidades por crédito. A revisão pedagógica deve confirmar os cortes (3 de 4 por faixa e mínimos por nível) e as fases creditadas com o público do piloto.
- As sete ilustrações novas do quiz são provisórias e próprias. O piloto deve verificar se as cenas comunicam posição e ação (M4 e D2).
- O nivelamento é refeito, não reavaliado automaticamente. Ajustar o nível com o desempenho na prática fica para uma decisão futura.
