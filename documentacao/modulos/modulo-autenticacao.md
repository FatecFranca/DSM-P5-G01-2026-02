# Módulo: Autenticação

> **Propósito:** descrever a autenticação do **Prosa** — cadastro, login, rotação de token,
> logout e login social.

Arquivos: [`apps/api/app/auth.py`](../../apps/api/app/auth.py) ·
[`apps/api/app/security.py`](../../apps/api/app/security.py) ·
[`apps/api/app/deps.py`](../../apps/api/app/deps.py) ·
[`apps/api/app/firebase.py`](../../apps/api/app/firebase.py).

Documentos relacionados: [10 — Segurança](../10-seguranca.md) ·
[07 — Referência da API](../07-referencia-da-api.md).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/auth/register` | cadastro (e-mail, senha, nome opcional) |
| POST | `/v1/auth/login` | login com e-mail/senha |
| POST | `/v1/auth/refresh` | rotação de refresh token |
| POST | `/v1/auth/logout` | revoga a sessão |
| POST | `/v1/auth/firebase` | login social (ID token do Firebase) |

## Comportamento

- **Senhas:** Argon2id (`hash_password`/`verify_password`).
- **Tokens:** JWT HS256 (`token`/`decode`), com `sub`, `sid`, `type`, `jti`, `iat`, `exp`.
- **Refresh rotativo:** `issue` cria `AuthSession` e grava `refresh_jti_hash`; `refresh`
  valida o JTI hash e emite um novo par; `logout` revoga a sessão.
- **Firebase:** `verify_firebase_token` valida assinatura, emissor, audiência (projeto) e
  exige `email_verified`; vincula a conta existente pelo e-mail ou cria uma sem senha.

## Autorização

`deps.current_user` decodifica o access token, carrega a sessão e o usuário, e rejeita
sessões revogadas ou inconsistentes (`401`).

## Notas

- Contas criadas só pelo Google não têm senha (`password_hash` nulo).
- `firebase_uid` é único e indexado.
- Sem `FIREBASE_PROJECT_ID`, `/v1/auth/firebase` responde `503`.
