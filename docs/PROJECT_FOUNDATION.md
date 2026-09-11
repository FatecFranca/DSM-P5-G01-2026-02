# Alfabetiza — documento-base do projeto

## 1. Parecer sobre a ideia

A proposta é viável, relevante e adequada a um projeto acadêmico de desenvolvimento mobile. O diferencial é conectar uma progressão simples de alfabetização a áudio e situações do cotidiano de jovens e adultos.

O conceito deve ser preservado, mas o primeiro ciclo precisa ser menor. Alfabetização completa é um objetivo de longo prazo; o MVP deve demonstrar um recorte funcional e mensurável.

### Pontos fortes

- problema social claro e público pouco atendido por interfaces não infantilizadas;
- uso de áudio como parte central da navegação, não como recurso decorativo;
- progressão pedagógica compreensível: letras, sílabas e palavras;
- organização contextual do vocabulário em trilhas de situações reais;
- possibilidade de funcionar parcialmente sem internet;
- bons temas para avaliação: usabilidade, acessibilidade, desempenho e qualidade do conteúdo.

### Pontos que exigem cuidado

1. **Pedagogia:** O aplicativo pode apoiar o ensino, mas não deve apresentar uma sequência como pedagogicamente comprovada sem essa revisão interna.
2. **Escopo:** frases, compreensão, gamificação avançada e painel de educador devem ficar fora do primeiro incremento.
3. **Público adulto:** textos, exemplos, cores, recompensas e linguagem devem respeitar autonomia e dignidade; a gamificação deve ser discreta e opcional.
4. **Dados pessoais:** conta, progresso e respostas podem ser dados sensíveis no contexto educacional. Coletar somente o necessário e informar a finalidade.

## 2. Visão do produto

O Alfabetiza será um aplicativo mobile de apoio à alfabetização inicial de jovens e adultos. Ele oferecerá atividades curtas, guiadas por áudio, para reconhecer letras, associar letras a sons e formar sílabas e palavras úteis no cotidiano.

**Proposta de valor:** aprender com autonomia, em pequenas etapas, usando uma interface adulta, acessível e capaz de dar retorno imediato sem depender de conexão permanente.

**Hipótese do produto:** uma experiência simples, guiada por áudio e baseada em palavras do cotidiano pode aumentar a prática e a confiança do aluno quando comparada a uma interface textual e infantilizada.

## 3. Escopo recomendado do MVP

O MVP deve comprovar este fluxo completo:

1. usuário entra em uma sessão de estudo;
2. ouve a instrução e pode repeti-la;
3. reconhece uma letra em atividades objetivas;
4. localiza a letra em uma palavra contextualizada;
5. o app apresenta feedback cuidadoso;
6. resultado e progresso são salvos localmente e sincronizados quando possível.

### Conteúdo do MVP

- as 26 letras do alfabeto, apresentadas progressivamente para que o usuário desenvolva familiaridade com todas elas antes de avançar para conteúdos mais complexos;
- vogais e consoantes introduzidas progressivamente na ordem `A, E, I, O, U, M, L, P, S, T, R, N, D, C, G, B, F, V, H, Q, J, K, Z, X, W, Y`, com `G` na segunda fase;
- 3 tipos de exercício: ouvir e escolher, reconhecer letra e localizar a letra em uma palavra;
- 8 a 12 palavras contextualizadas, liberadas conforme as letras necessárias, por exemplo: CASA, MESA, RUA, MALA e GATO;
- trilhas de cotidiano planejadas para a expansão seguinte: `Tem em casa`, `Família`, `Esporte`, `Trabalho`, `Saúde`, `Transporte`, `Compras` e `Documentos`;
- progresso por lição e histórico básico de tentativas;
- áudio pré-gravado ou gerado de forma controlada, com botão para repetir.

### Organização progressiva do conteúdo

O produto seguirá uma progressão inspirada em apps de prática curta e revisão frequente, sem copiar sua gamificação: primeiro letras, depois sílabas e só então palavras e frases contextualizadas.

Quando a base de decodificação estiver pronta, o vocabulário será organizado em trilhas de cotidiano, liberadas gradualmente:

1. `Tem em casa`;
2. `Família`;
3. `Esporte`;
4. `Trabalho`;
5. `Saúde`;
6. `Transporte`;
7. `Compras`;
8. `Documentos`.

Cada trilha começará com aproximadamente 8 a 12 palavras e depois 4 a 6 frases muito curtas, usando somente letras, sílabas e padrões já apresentados. O conteúdo terá imagem, áudio, significado contextual e revisão cumulativa. Nenhuma trilha será liberada apenas por visualização: o desbloqueio dependerá do domínio configurável das unidades anteriores.

O catálogo pedagógico será manualmente curado e versionado. Dados externos poderão apoiar a seleção, principalmente com frequência de uso e exemplos candidatos, mas não decidirão sozinhos a ordem, a adequação ao público adulto, a imagem, o áudio ou a frase final.

### Fora do MVP

- alfabetização completa;
- ranking social;
- painel completo de professor;
- produção livre de textos;
- chatbot ou geração automática de conteúdo sem revisão pedagógica.

## 4. Decisões técnicas recomendadas

### Mobile

Usar React Native com TypeScript e Expo no início, com atividades curtas, áudio, imagens e escolhas por toque.

### Adaptação da dificuldade de palavras

### Adaptação de conteúdo

No primeiro incremento, a adaptação será feita por regras transparentes: pré-requisitos, domínio, revisão espaçada, mistura de conteúdo conhecido e novo e reforço após erros. O app registrará tentativas, acertos, duração, repetição de áudio e trilha para a equipe observar quais conteúdos precisam de revisão.

Modelos estatísticos de dificuldade ou recomendação não fazem parte do produto atual. Só poderão ser considerados depois de dados suficientes, avaliação separada, revisão pedagógica e comparação explícita com as regras. Nenhum modelo de escrita, traçado ou reconhecimento manuscrito está previsto nesta fase.

> **Emenda de 18 de setembro de 2026 (ADR 0004).** A decisão explícita que este parágrafo exige foi tomada: um modelo de ranking no servidor, que só reordena itens já elegíveis, com regras como piso, shadow mode, ε-exploração, consentimento de pesquisa separado e um gate de promoção que compara com as regras em replay. Ele fica desligado em produção até a assinatura pedagógica registrada no ADR. Escrita, traçado e reconhecimento manuscrito continuam fora.

### Backend e armazenamento

Recomenda-se iniciar com uma API simples e PostgreSQL, mas evitar criar um backend grande antes de validar o fluxo pedagógico. O servidor deve armazenar conteúdo, conta, progresso e tentativas; a inferência da letra deve ocorrer localmente quando possível.

No aparelho, usar armazenamento local para conteúdo essencial, sessão e uma fila de sincronização. Cada tentativa sincronizada deve possuir um identificador idempotente para não ser duplicada quando a conexão retornar.

### Entidades mínimas

- `users`: identidade e configurações;
- `modules`: agrupamento de conteúdos;
- `lessons`: sequência de aprendizagem;
- `exercises`: instrução, tipo, resposta e mídia;
- `attempts`: resposta, resultado, duração e contexto da atividade;
- `progress`: estado por lição;
- `tracks`: trilhas de cotidiano, pré-requisitos, ordem e status de revisão;
- `words`: palavras aprovadas por trilha, com sílabas, padrões, letras exigidas, frequência de referência, dificuldade inicial e status pedagógico;
- `sentences`: frases curtas aprovadas, palavras exigidas, trilha, dificuldade, áudio e imagem;
- `content_reviews`: revisão, fonte, versão e aprovação pedagógica de cada item;
- `sync_queue`: eventos locais aguardando envio.

Não armazenar áudio ou imagem de usuários por padrão. Se a equipe precisar de dados adicionais para pesquisa, separar esse consentimento do cadastro, anonimizar os dados e definir prazo de retenção.

## 5. Requisitos essenciais

### Funcionais

- iniciar e encerrar uma sessão de estudo;
- reproduzir e repetir instruções de áudio;
- executar exercícios de seleção e localização de letras em palavras;
- registrar tentativas e progresso;
- continuar uma sessão básica sem internet;
- sincronizar resultados sem duplicação;
- permitir reiniciar uma atividade sem punição.

### Não funcionais

- botões grandes, alto contraste e textos curtos;
- toda ação crítica acompanhada por rótulo e/ou áudio;
- suporte a leitor de tela quando aplicável;
- resposta local das atividades em tempo aceitável;
- armazenamento seguro de sessão e senhas somente via mecanismo apropriado do backend;
- logs sem conteúdo pessoal desnecessário;
- tratamento de erro compreensível e sem linguagem constrangedora.

## 6. Métricas para validar o projeto

### Produto e aprendizagem

- percentual de usuários que conclui a primeira lição;
- taxa de conclusão por atividade;
- quantidade de tentativas até concluir;
- evolução entre pré-teste e pós-teste do pequeno conjunto de letras;
- taxa de retorno ao aplicativo;
- avaliação de clareza e confiança feita pelos participantes.

### Conteúdo adaptativo

- taxa de acerto e tentativas por letra, sílaba, palavra e trilha;
- conclusão e retenção por trilha de cotidiano;
- palavras ou frases que geram mais repetição de áudio, erro ou abandono;
- comparação entre a dificuldade definida pela equipe e o comportamento observado;
- estabilidade das regras de revisão antes de qualquer modelo automático.

### Usabilidade

Testar com poucas pessoas representativas do público, com consentimento e acompanhamento do integrante capacitado do grupo. Observar onde a pessoa hesita, pede ajuda, repete o áudio ou abandona. Não medir sucesso apenas por quantidade de pontos.

## 7. Roadmap executável

### Fase 0 — definição e validação

- revisar objetivos, sequência e linguagem com o integrante capacitado do grupo;
- escolher letras, sílabas, palavras, trilhas de cotidiano e roteiro de áudio;
- desenhar protótipo de baixa fidelidade;
- definir critérios de sucesso e cuidados de privacidade.

### Fase 1 — prova técnica

- validar reconhecimento de letras e palavras contextualizadas;
- demonstrar áudio, feedback e persistência local;
- validar a progressão de letras, sílabas e palavras contextualizadas.

### Fase 2 — MVP pedagógico

- criar a primeira trilha de letras;
- adicionar áudio e exercícios de reconhecimento;
- registrar progresso localmente;
- adicionar sílabas e poucas palavras;
- organizar as primeiras palavras na trilha `Tem em casa`;
- validar a primeira trilha `Tem em casa` com 8 a 12 palavras e frases curtas;
- sincronizar com a API.

### Fase 3 — avaliação

- testar com usuários representativos;
- avaliar clareza, progressão de letras e desempenho dos exercícios contextuais;
- observar desempenho por trilha, palavra e tipo de atividade;
- corrigir problemas de acessibilidade e linguagem;
- documentar limitações, resultados e próximos passos.

## 8. Primeiras entregas sugeridas

1. mapa de telas e fluxo do MVP;
2. catálogo inicial de letras, sílabas, palavras e áudios;
3. protótipo navegável;
4. catálogo versionado com aprovação pedagógica registrada;
5. aplicativo com uma lição completa;
6. persistência de tentativa e progresso;
7. teste com usuários e relatório de resultados.

## 9. Critério de sucesso do primeiro incremento

O primeiro incremento estará concluído quando uma pessoa conseguir abrir uma lição, ouvir a instrução, reconhecer uma letra, localizá-la em uma palavra e visualizar seu resultado depois de fechar e reabrir o aplicativo. Esse fluxo deve funcionar mesmo sem implementar ainda toda a trilha de alfabetização.

## 10. Perguntas em aberto para a equipe

- O MVP usará letras maiúsculas, minúsculas ou ambas? A recomendação inicial é começar com maiúsculas de forma.
- O grupo possui autorização para testar com usuários reais?
- Qual estratégia de áudio será usada para funcionar offline?
- Qual backend e mecanismo de autenticação serão adotados?
- Quais métricas serão aceitas como evidência de sucesso acadêmico?

Essas perguntas não impedem a criação do protótipo, mas devem ser respondidas antes de ampliar o escopo.
