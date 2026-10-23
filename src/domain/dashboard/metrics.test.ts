import { describe, expect, it } from "vitest";

import { summarizeQuotes } from "./metrics";

describe("indicadores do painel", () => {
  it("resume valores cotados, aprovados, conversão e margem ponderada", () => {
    const m = summarizeQuotes([
      { status: "rascunho", totalPrice: null, netProfit: null },
      { status: "enviado", totalPrice: "1000.00", netProfit: "100.00" },
      { status: "aprovado", totalPrice: "3000.00", netProfit: "600.00" },
      { status: "recusado", totalPrice: "1000.00", netProfit: "0.00" },
      { status: "cancelado", totalPrice: "5000.00", netProfit: "500.00" },
    ]);
    expect(m.total).toBe(5);
    expect(m.quotedCount).toBe(3);
    expect(m.quotedValue.toString()).toBe("5000");
    expect(m.approvedValue.toString()).toBe("3000");
    expect(m.conversionPercent?.toString()).toBe("50");
    expect(m.weightedNetMarginPercent?.toString()).toBe("14"); // 700 / 5000
    expect(m.approvedNetMarginPercent?.toString()).toBe("20");
    expect(m.byStatus.cancelado).toBe(1);
  });

  it("lida com lista vazia", () => {
    const m = summarizeQuotes([]);
    expect(m.quotedValue.toString()).toBe("0");
    expect(m.conversionPercent).toBeNull();
    expect(m.weightedNetMarginPercent).toBeNull();
  });
});
