/** Nome mostrado no perfil: o do cadastro ou, para contas sem nome, o começo do e-mail. */
export function displayName(me: { name: string | null; email: string }): string | null {
  const name = me.name?.trim();
  if (name) return name;
  const local = me.email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
}
