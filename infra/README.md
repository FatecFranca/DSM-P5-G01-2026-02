# Infraestrutura

Stack de produção para uma VPS Ubuntu: PostgreSQL persistente, API sem dependências de ML e Caddy com HTTPS automático. Somente o proxy publica portas; banco e API ficam na rede interna.

## Subida

1. Aponte o DNS do domínio para a VPS e libere TCP 80/443 e UDP 443.
2. Copie `.env.example` para `.env`, substitua todos os valores de exemplo e restrinja a leitura (`chmod 600 .env`).
3. Execute `docker compose config --quiet` e `docker compose up -d --build` nesta pasta.
4. Execute migrations da API, conforme o README de `apps/api`.
5. Confirme `docker compose ps`, `curl -fsS https://SEU_DOMINIO/health` e verifique que todos os serviços estão `healthy`.

O Caddy obtém e renova certificados automaticamente. Não use o domínio de exemplo em produção. Logs do proxy não incluem corpo de requisição; a API também deve evitar PII e imagens de escrita.

## Backup e restauração

`scripts/backup.sh` gera um dump customizado e aplica retenção (14 dias por padrão). Copie os dumps para armazenamento externo criptografado; o volume local sozinho não é backup.

```sh
./scripts/backup.sh
./scripts/restore.sh backups/alfabetiza-DATA.dump --confirm-replace-database
```

A restauração usa `--clean` e substitui objetos existentes. Teste periodicamente em uma instância isolada, faça smoke test da API e registre a evidência. Agende o backup no host (cron/systemd) e monitore código de saída e espaço em disco.

## Operação segura

- Gere `POSTGRES_PASSWORD` e `JWT_SECRET` com fonte criptograficamente segura; não os inclua em Git ou logs.
- Atualize imagens deliberadamente e execute `docker compose pull && docker compose up -d`; tags estão fixadas por versão principal/secundária.
- Restrinja SSH por chave, habilite firewall e atualizações de segurança no host.
- Antes de produção, valide backup/restauração real e rollback. `docker compose restart` preserva os volumes nomeados.
