import { describe, expect, it } from "vitest";

import {
  costPerConsumptionUnit,
  effectivePurchaseUnitCost,
  offerFreshness,
  selectOffer,
  type OfferPricing,
} from "./offers";

function offer(overrides: Partial<OfferPricing>): OfferPricing {
  return {
    id: "o1",
    supplierId: "s1",
    supplierName: "Fornecedor 1",
    materialId: "m1",
    purchaseUnitCode: "barra",
    packageQuantity: "6",
    price: "120",
    discountPercent: "0",
    purchaseTaxPercent: "0",
    freightPerUnit: "0",
    quotedAt: "2026-10-01",
    validUntil: null,
    isPreferred: false,
    active: true,
    ...overrides,
  };
}

describe("custo efetivo de ofertas", () => {
  it("aplica desconto, tributo não recuperável e frete por unidade de compra", () => {
    // 200 × 0,90 × 1,05 + 6 = 195
    const o = offer({ price: "200", discountPercent: "10", purchaseTaxPercent: "5", freightPerUnit: "6" });
    expect(effectivePurchaseUnitCost(o).toString()).toBe("195");
    expect(costPerConsumptionUnit(o).toString()).toBe("32.5");
  });

  it("trata frete desconhecido como zero (com aviso na seleção)", () => {
    expect(effectivePurchaseUnitCost(offer({ freightPerUnit: null })).toString()).toBe("120");
  });

  it("calcula sem erro de ponto flutuante", () => {
    const o = offer({ price: "0.1", packageQuantity: "1", freightPerUnit: "0.2" });
    expect(effectivePurchaseUnitCost(o).toString()).toBe("0.3");
  });
});

describe("situação do preço", () => {
  it("classifica vigente, desatualizada e vencida", () => {
    expect(offerFreshness({ quotedAt: "2026-10-01", validUntil: null }, "2026-10-23", 90).status).toBe("vigente");
    expect(offerFreshness({ quotedAt: "2026-01-01", validUntil: null }, "2026-10-23", 90).status).toBe(
      "desatualizada",
    );
    expect(offerFreshness({ quotedAt: "2026-10-01", validUntil: "2026-10-10" }, "2026-10-23", 90).status).toBe(
      "vencida",
    );
  });
});

describe("seleção de oferta", () => {
  const opts = { today: "2026-10-23", staleAfterDays: 90 };

  it("prefere a oferta preferencial vigente", () => {
    const sel = selectOffer(
      [offer({ id: "barata", price: "100" }), offer({ id: "pref", price: "130", isPreferred: true })],
      opts,
    );
    expect(sel?.offer.id).toBe("pref");
    expect(sel?.reason).toBe("preferencial");
  });

  it("sem preferencial, escolhe o menor custo por unidade de consumo", () => {
    const sel = selectOffer(
      [
        offer({ id: "a", price: "120", packageQuantity: "6" }), // 20/m
        offer({ id: "b", price: "100", packageQuantity: "4" }), // 25/m
      ],
      opts,
    );
    expect(sel?.offer.id).toBe("a");
    expect(sel?.unitCost.toString()).toBe("20");
  });

  it("ignora vencidas quando há alternativa e avisa quando só há vencidas", () => {
    const vencida = offer({ id: "v", price: "50", validUntil: "2026-10-01", isPreferred: true });
    expect(selectOffer([vencida, offer({ id: "ok" })], opts)?.offer.id).toBe("ok");
    const only = selectOffer([vencida], { ...opts, materialLabel: "PERF-01" });
    expect(only?.offer.id).toBe("v");
    expect(only?.warnings[0]).toMatch(/PERF-01: preço de Fornecedor 1 vencido/);
  });

  it("ignora inativas e retorna null sem ofertas", () => {
    expect(selectOffer([offer({ active: false })], opts)).toBeNull();
    expect(selectOffer([], opts)).toBeNull();
  });
});
