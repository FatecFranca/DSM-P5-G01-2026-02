export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function validateCredentials(email: string, password: string): string[] {
  const errors: string[] = [];
  if (!/^\S+@\S+\.\S+$/.test(normalizeEmail(email))) errors.push("Informe um e-mail válido.");
  if (password.length < 8) errors.push("A senha deve ter pelo menos 8 caracteres.");
  return errors;
}

/** Identificador da conta (claim `sub`) dentro do JWT de acesso; `undefined` se o token não for legível. */
export function accountIdFromToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!payload) return undefined;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bits = 0, acc = 0, bytes: number[] = [];
    for (const char of payload) {
      const value = alphabet.indexOf(char);
      if (value < 0) continue;
      acc = (acc << 6) | value; bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((acc >> bits) & 0xff); }
    }
    const sub = (JSON.parse(String.fromCharCode(...bytes)) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub ? sub : undefined;
  } catch { return undefined; }
}
