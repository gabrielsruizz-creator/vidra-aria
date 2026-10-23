import { describe, expect, it } from "vitest";

import { isValidCnpj, isValidCpf, parseDecimalBR } from "./parse";

describe("parseDecimalBR", () => {
  it.each([
    ["1.234,56", "1234.56"],
    ["1234,56", "1234.56"],
    ["R$ 1.234,56", "1234.56"],
    ["0,1", "0.1"],
    [",5", "0.5"],
    ["12,5%", "12.5"],
    ["1234.5", "1234.5"],
    ["1.5", "1.5"],
    ["1.234.567", "1234567"],
    ["007", "7"],
    ["-3,25", "-3.25"],
    ["-0", "0"],
  ])("%s -> %s", (input, expected) => {
    expect(parseDecimalBR(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "1.500", "12.34,5", "1e5"])("rejeita %s", (input) => {
    expect(() => parseDecimalBR(input)).toThrow();
  });
});

describe("documentos", () => {
  it("valida CNPJ", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });

  it("valida CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
});
