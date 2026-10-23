import { describe, expect, it } from "vitest";
import { z } from "zod";

import { checkbox, decimal, optionalCnpj, optionalDecimal, optionalText, percent } from "./schemas";

describe("esquemas de formulário", () => {
  it("normaliza decimais no padrão brasileiro", () => {
    const s = decimal({ label: "o preço", min: "0", maxScale: 4 });
    expect(s.parse("1.234,5678")).toBe("1234.5678");
    expect(s.safeParse("1,23456").success).toBe(false);
    expect(s.safeParse("-1").success).toBe(false);
    expect(s.safeParse("").success).toBe(false);
  });

  it("aceita decimal opcional vazio como null", () => {
    const s = optionalDecimal({ label: "o frete", min: "0" });
    expect(s.parse("")).toBeNull();
    expect(s.parse(undefined)).toBeNull();
    expect(s.parse("12,5")).toBe("12.5");
  });

  it("valida percentuais", () => {
    const s = percent("o desconto");
    expect(s.parse("12,5")).toBe("12.5");
    expect(s.safeParse("100").success).toBe(false);
    const msg = s.safeParse("120");
    expect(msg.success).toBe(false);
  });

  it("converte textos vazios em null e checkbox em boolean", () => {
    const s = z.object({ notes: optionalText(), active: checkbox() });
    expect(s.parse({ notes: "  ", active: "on" })).toEqual({ notes: null, active: true });
    expect(s.parse({})).toEqual({ notes: null, active: false });
  });

  it("valida CNPJ e devolve só dígitos", () => {
    expect(optionalCnpj().parse("11.222.333/0001-81")).toBe("11222333000181");
    expect(optionalCnpj().safeParse("11.222.333/0001-82").success).toBe(false);
    expect(optionalCnpj().parse("")).toBeNull();
  });
});
