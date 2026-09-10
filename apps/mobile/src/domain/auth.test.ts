import { describe, expect, it } from "vitest";
import { normalizeEmail, validateCredentials } from "./auth";
describe("credenciais", () => {
  it("normaliza e-mail sem alterar senha", () => expect(normalizeEmail(" Pessoa@Email.COM ")).toBe("pessoa@email.com"));
  it("valida e-mail e senha mínima", () => expect(validateCredentials("errado", "123")).toHaveLength(2));
});
