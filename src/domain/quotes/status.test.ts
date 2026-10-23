import { describe, expect, it } from "vitest";

import { canTransition, formatQuoteNumber } from "./status";
import { quoteItemSchema } from "./schemas";

describe("status do orçamento", () => {
  it("segue o ciclo de vida", () => {
    expect(canTransition("rascunho", "enviado")).toBe(true);
    expect(canTransition("rascunho", "aprovado")).toBe(false);
    expect(canTransition("enviado", "aprovado")).toBe(true);
    expect(canTransition("aprovado", "rascunho")).toBe(false);
    expect(canTransition("cancelado", "rascunho")).toBe(false);
  });

  it("formata o número", () => {
    expect(formatQuoteNumber(42)).toBe("ORC-00042");
  });
});

describe("item do orçamento", () => {
  it("valida medidas inteiras em mm e quantidade decimal", () => {
    const parsed = quoteItemSchema.parse({
      product_id: "8c1d7f5e-6a8b-4c2d-9e3f-1a2b3c4d5e6f",
      width_mm: "1200",
      height_mm: "2100",
      quantity: "1,5",
      include_installation: "on",
      extra_cost: "",
    });
    expect(parsed).toMatchObject({ width_mm: 1200, height_mm: 2100, quantity: "1.5", include_installation: true, extra_cost: "0" });
    expect(quoteItemSchema.safeParse({ product_id: "8c1d7f5e-6a8b-4c2d-9e3f-1a2b3c4d5e6f", width_mm: "12,5", quantity: "1" }).success).toBe(false);
  });
});
