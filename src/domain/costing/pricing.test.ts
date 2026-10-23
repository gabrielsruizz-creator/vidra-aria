import { describe, expect, it } from "vitest";

import { dec } from "@/domain/shared/decimal";

import { allocate, marginsFor, markupDivisor, recommendedPrice } from "./pricing";

describe("formação de preço", () => {
  it("calcula o preço pelo divisor de mark-up", () => {
    expect(markupDivisor("15", "20").toString()).toBe("0.65");
    expect(recommendedPrice("650", "15", "20").toString()).toBe("1000");
  });

  it("preço recomendado entrega exatamente a margem desejada", () => {
    const price = recommendedPrice("650", "15", "20");
    const m = marginsFor({ finalPrice: price, variableCost: "600", overheadCost: "50", saleDeductionsPercent: "15" });
    expect(m.saleDeductionsAmount.toString()).toBe("150");
    expect(m.contributionMargin.toString()).toBe("250");
    expect(m.netProfit.toString()).toBe("200");
    expect(m.netMarginPercent.toString()).toBe("20");
    expect(m.contributionMarginPercent.toString()).toBe("25");
  });

  it("rejeita margem + deduções ≥ 100%", () => {
    expect(() => markupDivisor("30", "70")).toThrow();
  });

  it("rateia proporcionalmente e sem perda", () => {
    const parts = allocate("100", [dec(1), dec(2), dec(1)]);
    expect(parts.map((p) => p.toString())).toEqual(["25", "50", "25"]);
    expect(allocate("90", [dec(0), dec(0), dec(0)]).map((p) => p.toString())).toEqual(["30", "30", "30"]);
  });
});
