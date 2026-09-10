# Estratégia do catálogo de conteúdo

## Decisão

O catálogo inicial será criado manualmente e versionado no projeto. Datasets serão usados como apoio para descobrir candidatos, estimar frequência e encontrar exemplos, nunca como fonte automática de conteúdo liberado no aplicativo.

Essa decisão é importante porque frequência não mede, sozinha, facilidade de leitura, relevância para adultos, qualidade da imagem, clareza do áudio, adequação regional ou segurança pedagógica.

## Progressão de conteúdo

1. **Letras:** reconhecimento visual, nome, som e discriminação por escolha.
2. **Sílabas:** combinação regular de consoante e vogal, mistura de sílabas conhecidas e identificação da sílaba inicial.
3. **Trilha `Tem em casa`:** palavras concretas e frases muito curtas sobre objetos e ações da casa.
4. **Trilha `Família`:** pessoas, relações e situações familiares.
5. **Trilhas seguintes:** `Esporte`, `Trabalho`, `Saúde`, `Transporte`, `Compras` e `Documentos`.

Cada trilha deve começar pequena: 8 a 12 palavras aprovadas e 4 a 6 frases curtas. Os itens só podem usar letras e padrões já ensinados. A expansão acontece depois de observar compreensão, erros, repetição de áudio e facilidade de navegação.

## Como usar datasets

### Linguateca / AC/DC

Usar para consultar frequência e contexto em português brasileiro. O Corpus Brasileiro reúne textos de diferentes gêneros e disponibiliza consultas e listas de frequência. A fonte é útil para evitar escolher palavras raras por intuição, mas os exemplos ainda precisam de seleção e revisão humana.

- [Listas de frequência da Linguateca](https://www.linguateca.pt/acesso/ordenador.php)
- [Acesso aos corpora AC/DC](https://linguateca.pt/acesso/index.php)
- [Descrição do Corpus Brasileiro](https://www.linguateca.pt/acesso/desc_corpus.php?corpus=CBRAS)

### wordfreq

Usar como uma segunda referência rápida de frequência para português. O projeto agrega fontes diferentes e suporta vários idiomas, mas a própria documentação informa que seus dados são um retrato e podem estar desatualizados; portanto, o valor não deve virar regra pedagógica nem ordem fixa da trilha. A licença do pacote é Apache-2.0.

- [Repositório e documentação do wordfreq](https://github.com/rspeer/wordfreq)
- [Licença do pacote](https://github.com/rspeer/wordfreq/blob/master/pyproject.toml)

### Tatoeba

Usar apenas para buscar candidatos a frases simples e traduções. As frases precisam ser filtradas por tamanho, vocabulário ensinado, naturalidade para o público e licença. A página oficial informa que os arquivos de frases são disponibilizados sob CC BY 2.0 FR, que parte também está em CC0 e que a licença do áudio deve ser verificada por gravação.

- [Downloads e licenças do Tatoeba](https://tatoeba.org/en/downloads)

## Registro obrigatório de cada item

Cada palavra ou frase aprovada deve registrar:

- `id`, texto normalizado e versão;
- trilha e ordem sugerida;
- separação silábica e padrões envolvidos;
- letras e sílabas pré-requisito;
- dificuldade inicial e justificativa;
- fonte de frequência, quando houver;
- imagem, rótulo acessível e áudio;
- status de revisão pedagógica;
- observações de regionalismo, acentuação ou ambiguidade;
- licença e atribuição de qualquer recurso externo.

## Regra prática para o primeiro catálogo

Começar com aproximadamente 40 a 60 palavras distribuídas entre letras, sílabas e a primeira trilha. A equipe deve aprovar primeiro um conjunto pequeno e coerente, testar a sequência e só depois ampliar. É preferível ter poucas palavras reais, úteis e bem ilustradas a importar milhares de palavras sem controle pedagógico.
