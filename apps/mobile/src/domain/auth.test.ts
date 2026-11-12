import { describe, expect, it } from "vitest";
import { accountIdFromToken, normalizeEmail, validateCredentials } from "./auth";
describe("credenciais", () => {
  it("normaliza e-mail sem alterar senha", () => expect(normalizeEmail(" Pessoa@Email.COM ")).toBe("pessoa@email.com"));
  it("valida e-mail e senha mínima", () => expect(validateCredentials("errado", "123")).toHaveLength(2));
});

describe("conta dona do token", () => {
  const jwt = (claims: object) => `h.${btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.s`;
  it("lê o sub do JWT", () => expect(accountIdFromToken(jwt({ sub: "user-123", sid: "x" }))).toBe("user-123"));
  it("devolve undefined para token ilegível", () => { expect(accountIdFromToken("lixo")).toBeUndefined(); expect(accountIdFromToken(jwt({}))).toBeUndefined(); });
});
