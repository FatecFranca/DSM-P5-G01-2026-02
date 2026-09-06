# Alfabetiza — documento-base do projeto

## 1. Parecer sobre a ideia

A proposta é viável, relevante e adequada a um projeto acadêmico de desenvolvimento mobile com Machine Learning. O diferencial não é apenas “usar IA”, mas conectar a classificação de escrita a uma experiência de alfabetização funcional, com áudio e situações do cotidiano de jovens e adultos.

O conceito deve ser preservado, mas o primeiro ciclo precisa ser menor. Alfabetização completa é um objetivo de longo prazo; o MVP deve demonstrar um recorte funcional e mensurável.

### Pontos fortes

- problema social claro e público pouco atendido por interfaces não infantilizadas;
- uso de áudio como parte central da navegação, não como recurso decorativo;
- progressão pedagógica compreensível: letras, sílabas e palavras;
- aplicação concreta de classificação de imagens manuscritas;
- possibilidade de funcionar parcialmente sem internet;
- bons temas para avaliação: usabilidade, acessibilidade, desempenho e qualidade do modelo.

### Pontos que exigem cuidado

1. **Pedagogia:** O aplicativo pode apoiar o ensino, mas não deve apresentar uma sequência como pedagogicamente comprovada sem essa revisão interna.
2. **Escopo:** frases, compreensão, gamificação avançada e painel de educador devem ficar fora do primeiro incremento.
3. **Classificação da escrita:** o modelo pode errar por causa de traços, tamanho, posição, iluminação simulada, letra cursiva ou diferenças entre o dataset e a escrita no celular. Baixa confiança deve gerar nova tentativa, nunca uma acusação de erro.
4. **Público adulto:** textos, exemplos, cores, recompensas e linguagem devem respeitar autonomia e dignidade; a gamificação deve ser discreta e opcional.
5. **Dados pessoais:** escrita, voz, progresso e perfil podem ser dados sensíveis no contexto educacional. Coletar somente o necessário, informar a finalidade e obter consentimento quando houver uso das amostras para treinamento.

## 2. Visão do produto

O Alfabetiza será um aplicativo mobile de apoio à alfabetização inicial de jovens e adultos. Ele oferecerá atividades curtas, guiadas por áudio, para reconhecer letras, associar letras a sons, praticar a escrita e formar sílabas e palavras úteis no cotidiano.

**Proposta de valor:** aprender com autonomia, em pequenas etapas, usando uma interface adulta, acessível e capaz de dar retorno imediato sobre a escrita sem depender de conexão permanente.

**Hipótese do produto:** uma experiência simples, guiada por áudio e baseada em palavras do cotidiano pode aumentar a prática e a confiança do aluno quando comparada a uma interface textual e infantilizada.

## 3. Escopo recomendado do MVP

O MVP deve comprovar este fluxo completo:

1. usuário entra em uma sessão de estudo;
2. ouve a instrução e pode repeti-la;
3. reconhece uma letra em uma atividade objetiva;
4. desenha a letra em uma área de escrita;
5. o modelo classifica a imagem no dispositivo;
6. o app apresenta feedback cuidadoso;
7. resultado e progresso são salvos localmente e sincronizados quando possível.

### Conteúdo do MVP

- as 26 letras do alfabeto, apresentadas progressivamente para que o usuário desenvolva familiaridade com todas elas antes de avançar para conteúdos mais complexos;
- vogais e algumas consoantes que permitam formar palavras simples;
- 3 tipos de exercício: ouvir e escolher, reconhecer letra e escrever letra;
- 4 a 8 palavras contextualizadas, por exemplo: CASA, MESA, RUA e MALA;
- progresso por lição e histórico básico de tentativas;
- áudio pré-gravado ou gerado de forma controlada, com botão para repetir.

### Fora do MVP

- alfabetização completa;
- ranking social;
- painel completo de professor;
- treinamento contínuo com dados dos usuários;
- reconhecimento de palavras manuscritas inteiras.

## 4. Decisões técnicas recomendadas

### Mobile

Usar React Native com TypeScript e Expo no início. A área de escrita pode começar com um componente simples de traçado; só adotar React Native Skia se a experiência exigir maior controle de desenho ou desempenho.

### Machine Learning

O primeiro modelo deve classificar letras isoladas, preferencialmente em letras de forma e no mesmo formato usado pelo exercício. O pipeline deve padronizar orientação, escala, centralização, espessura e fundo antes da inferência.

O treinamento deve comparar:

- modelo treinado apenas com dataset público;
- modelo ajustado com amostras coletadas pelo grupo;
- desempenho em um conjunto de teste separado, que não seja usado no treinamento.

Relatar accuracy, precision, recall, F1-score e matriz de confusão por classe. Também registrar latência e tamanho do modelo no dispositivo. Accuracy sozinha não é suficiente, especialmente se algumas letras forem mais fáceis que outras.

O modelo deve retornar pelo menos a classe, a confiança e um estado de incerteza. O aplicativo não deve transformar automaticamente “modelo não reconheceu” em “aluno escreveu errado”.

### Backend e armazenamento

Recomenda-se iniciar com uma API simples e PostgreSQL, mas evitar criar um backend grande antes de validar o fluxo pedagógico. O servidor deve armazenar conteúdo, conta, progresso e tentativas; a inferência da letra deve ocorrer localmente quando possível.

No aparelho, usar armazenamento local para conteúdo essencial, sessão e uma fila de sincronização. Cada tentativa sincronizada deve possuir um identificador idempotente para não ser duplicada quando a conexão retornar.

### Entidades mínimas

- `users`: identidade e configurações;
- `modules`: agrupamento de conteúdos;
- `lessons`: sequência de aprendizagem;
- `exercises`: instrução, tipo, resposta e mídia;
- `attempts`: resposta, resultado, confiança, duração e versão do modelo;
- `progress`: estado por lição;
- `sync_queue`: eventos locais aguardando envio.

Não armazenar imagem bruta da escrita por padrão. Se a equipe precisar de amostras para pesquisa, separar esse consentimento do cadastro, anonimizar os dados e definir prazo de retenção.

## 5. Requisitos essenciais

### Funcionais

- iniciar e encerrar uma sessão de estudo;
- reproduzir e repetir instruções de áudio;
- executar exercícios de seleção e escrita;
- classificar letras no dispositivo;
- indicar confiança e tratar incerteza;
- registrar tentativas e progresso;
- continuar uma sessão básica sem internet;
- sincronizar resultados sem duplicação;
- permitir reiniciar uma atividade sem punição.

### Não funcionais

- botões grandes, alto contraste e textos curtos;
- toda ação crítica acompanhada por rótulo e/ou áudio;
- suporte a leitor de tela quando aplicável;
- resposta local do classificador em tempo aceitável;
- armazenamento seguro de sessão e senhas somente via mecanismo apropriado do backend;
- logs sem conteúdo de escrita ou dados pessoais desnecessários;
- tratamento de erro compreensível e sem linguagem constrangedora.

## 6. Métricas para validar o projeto

### Produto e aprendizagem

- percentual de usuários que conclui a primeira lição;
- taxa de conclusão por atividade;
- quantidade de tentativas até concluir;
- evolução entre pré-teste e pós-teste do pequeno conjunto de letras;
- taxa de retorno ao aplicativo;
- avaliação de clareza e confiança feita pelos participantes.

### Modelo

- F1 macro e por letra;
- matriz de confusão;
- taxa de classificações abaixo do limiar de confiança;
- latência de inferência;
- tamanho do modelo;
- desempenho em amostras diferentes das usadas no treinamento.

### Usabilidade

Testar com poucas pessoas representativas do público, com consentimento e acompanhamento do integrante capacitado do grupo. Observar onde a pessoa hesita, pede ajuda, repete o áudio ou abandona. Não medir sucesso apenas por quantidade de pontos.

## 7. Roadmap executável

### Fase 0 — definição e validação

- revisar objetivos, sequência e linguagem com o integrante capacitado do grupo;
- escolher letras, palavras e roteiro de áudio;
- desenhar protótipo de baixa fidelidade;
- definir critérios de sucesso e cuidados de privacidade.

### Fase 1 — prova técnica

- criar tela de escrita;
- preparar imagens no formato de entrada;
- treinar classificador inicial;
- executar inferência local;
- demonstrar o fluxo escrever → classificar → feedback.

### Fase 2 — MVP pedagógico

- criar a primeira trilha de letras;
- adicionar áudio e exercícios de reconhecimento;
- registrar progresso localmente;
- adicionar sílabas e poucas palavras;
- sincronizar com a API.

### Fase 3 — avaliação

- testar com usuários representativos;
- comparar modelos e analisar a matriz de confusão;
- corrigir problemas de acessibilidade e linguagem;
- documentar limitações, resultados e próximos passos.

## 8. Primeiras entregas sugeridas

1. mapa de telas e fluxo do MVP;
2. catálogo inicial de letras, sílabas, palavras e áudios;
3. protótipo navegável;
4. modelo baseline com avaliação reproduzível;
5. aplicativo com uma lição completa;
6. persistência de tentativa e progresso;
7. teste com usuários e relatório de resultados.

## 9. Critério de sucesso do primeiro incremento

O primeiro incremento estará concluído quando uma pessoa conseguir abrir uma lição, ouvir a instrução, escrever uma letra, receber uma resposta local em caso de alta ou baixa confiança e visualizar seu resultado depois de fechar e reabrir o aplicativo. Esse fluxo deve funcionar mesmo sem implementar ainda toda a trilha de alfabetização.

## 10. Perguntas em aberto para a equipe

- O MVP usará letras maiúsculas, minúsculas ou ambas? A recomendação inicial é começar com maiúsculas de forma.
- O grupo possui autorização para testar com usuários reais?
- Qual estratégia de áudio será usada para funcionar offline?
- Qual backend e mecanismo de autenticação serão adotados?
- Quais métricas serão aceitas como evidência de sucesso acadêmico?

Essas perguntas não impedem a criação do protótipo, mas devem ser respondidas antes de ampliar o escopo.
