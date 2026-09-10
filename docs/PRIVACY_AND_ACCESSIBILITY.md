# Privacidade e acessibilidade

## Dados e consentimento

O MVP coleta somente conta, progresso, respostas, duração, confiança e versão do modelo necessários à continuidade da aprendizagem. A imagem bruta do traçado não integra os eventos enviados à API nem o schema persistente.

Qualquer coleta futura de amostras para pesquisa exige consentimento separado do cadastro, finalidade explícita, anonimização, prazo de retenção e opção de retirada. Testes com participantes só podem começar após aprovação interna e registro do consentimento.

Tokens ficam no armazenamento seguro do dispositivo; senhas são tratadas apenas pela API e armazenadas como hash Argon2id. Logs não devem conter senha, token, traçado, e-mail completo ou outro dado pessoal desnecessário.

## Checklist de acessibilidade

- [x] Linguagem curta, adulta e sem punição.
- [x] Controles principais grandes e com rótulo textual.
- [x] Estados de erro e incerteza expressos em texto, sem depender apenas de cor.
- [x] Possibilidade de repetir instruções e reiniciar atividades.
- [x] Rótulos e dicas para tecnologias assistivas nos controles críticos.
- [x] Ordem de navegação coerente e foco em uma ação principal por tela.
- [ ] Contraste medido em dispositivo físico nas configurações finais do sistema.
- [ ] Fluxo completo validado com TalkBack em Android físico.
- [ ] Smoke test com VoiceOver em iOS.
- [ ] Linguagem e sequência aprovadas pelo integrante capacitado do grupo.

Os itens dependentes de hardware ou revisão humana não são marcados como concluídos por validação automatizada.

