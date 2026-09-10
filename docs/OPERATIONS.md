# Operação do MVP

## Ambientes

- Desenvolvimento: mobile Expo local, API local e PostgreSQL via Docker Compose.
- Produção: VPS Ubuntu na Azure com proxy HTTPS, API e PostgreSQL em rede privada do Compose.
- Segredos: criar `.env` a partir do exemplo e definir valores únicos fora do Git.

## Implantação

1. Configurar DNS para o endereço da VPS.
2. Instalar Docker Engine e o plugin Compose.
3. Liberar apenas SSH administrado, HTTP e HTTPS no firewall.
4. Copiar o código e preencher `infra/.env` sem versioná-lo.
5. Subir os serviços, executar as migrations e o seed documentados pela API.
6. Confirmar o health check por HTTPS antes de apontar o aplicativo para a API.

## Backup e restauração

O diretório `infra/scripts` contém comandos versionados de backup e restauração. O backup deve ser armazenado fora da VPS, criptografado e submetido periodicamente a um teste real de restauração em banco descartável.

## Evidências operacionais obrigatórias

- resposta HTTPS de `/health`;
- containers saudáveis após reinício da VPS;
- migration e seed concluídos;
- restauração de backup validada em banco separado;
- ausência de segredos no Git e de dados pessoais nos logs.

Essas evidências só podem ser marcadas como obtidas depois da implantação no ambiente Azure autorizado.

