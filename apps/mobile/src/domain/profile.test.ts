import { describe, expect, it } from "vitest";
import { displayName } from "./profile";

describe("displayName", () => {
  it("prefere o nome informado no cadastro", () => {
    expect(displayName({ name: "  Ana ", email: "ana@x.com" })).toBe("Ana");
  });
  it("usa o começo do e-mail quando a conta não tem nome", () => {
    expect(displayName({ name: null, email: "joao.silva@x.com" })).toBe("Joao silva");
  });
  it("devolve null sem nome nem e-mail", () => {
    expect(displayName({ name: "", email: "" })).toBeNull();
  });
});
