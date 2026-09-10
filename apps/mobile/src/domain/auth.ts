export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function validateCredentials(email: string, password: string): string[] {
  const errors: string[] = [];
  if (!/^\S+@\S+\.\S+$/.test(normalizeEmail(email))) errors.push("Informe um e-mail válido.");
  if (password.length < 8) errors.push("A senha deve ter pelo menos 8 caracteres.");
  return errors;
}
