import { describe, expect, it } from "vitest";

import { calculateQuote, ENGINE_VERSION } from "./engine";
import type { CostingInput, CostingSuccess, MaterialCostInfo, ProductVersionSpec, QuoteItemInput } from "./types";

// Dados SINTÉTICOS de teste — não representam preços nem fichas reais.
const units = {
  m: { code: "m", symbol: "m", dimension: "comprimento" as const, factorToBase: "1" },
  mm: { code: "mm", symbol: "mm", dimension: "comprimento" as const, factorToBase: "0.001" },
  m2: { code: "m2", symbol: "m²", dimension: "area" as const, factorToBase: "1" },
  un: { code: "un", symbol: "un", dimension: "unidade" as const, factorToBase: "1" },
};

function material(
  id: string,
  unit: keyof typeof units,
  offer: { purchaseUnitCode: string; packageQuantity: string; purchaseUnitCost: string } | null,
): MaterialCostInfo {
  return {
    materialId: id,
    code: id.toUpperCase(),
    description: `Material ${id}`,
    consumptionUnit: units[unit],
    offer: offer && {
      id: `of-${id}`,
      supplierId: "sup-1",
      supplierName: "Fornecedor teste",
      purchaseUnitCode: offer.purchaseUnitCode,
      packageQuantity: offer.packageQuantity,
      purchaseUnitCost: offer.purchaseUnitCost,
      unitCost: (Number(offer.purchaseUnitCost) / Number(offer.packageQuantity)).toString(),
      quotedAt: "2026-10-01",
      validUntil: null,
      freshness: "vigente",
    },
    warnings: [],
  };
}

const version: ProductVersionSpec = {
  id: "v1",
  productId: "p1",
  productCode: "BOX-T",
  productName: "Produto de teste",
  versionNumber: 1,
  requiresDimensions: true,
  minWidthMm: 300,
  maxWidthMm: 3000,
  minHeightMm: null,
  maxHeightMm: null,
  components: [
    { id: "c1", position: 1, materialId: "vidro", description: "folha", quantityBasis: "area", coefficient: "1", offsetMm: "0", wastePercent: "10" },
    { id: "c2", position: 2, materialId: "perfil", description: "quadro", quantityBasis: "perimetro", coefficient: "1", offsetMm: "0", wastePercent: "5" },
    { id: "c3", position: 3, materialId: "perfil", description: "travessa", quantityBasis: "largura", coefficient: "2", offsetMm: "-50", wastePercent: "0" },
    { id: "c4", position: 4, materialId: "kit", description: null, quantityBasis: "fixa", coefficient: "1", offsetMm: "0", wastePercent: "0" },
  ],
  laborOperations: [
    { id: "l1", position: 1, laborRateId: "serralheria", stage: "fabricacao", description: "Montagem", timeBasis: "fixa", minutes: "30" },
    { id: "l2", position: 2, laborRateId: "instalador", stage: "instalacao", description: "Instalação", timeBasis: "area", minutes: "20" },
  ],
};

function item(overrides: Partial<QuoteItemInput> = {}): QuoteItemInput {
  return {
    quoteItemId: "qi-1",
    position: 1,
    description: null,
    widthMm: 1000,
    heightMm: 2000,
    quantity: "2",
    includeInstallation: true,
    extraCost: "0",
    version,
    ...overrides,
  };
}

function input(overrides: Partial<CostingInput> = {}): CostingInput {
  return {
    items: [item()],
    materials: {
      vidro: material("vidro", "m2", { purchaseUnitCode: "m2", packageQuantity: "1", purchaseUnitCost: "150" }),
      perfil: material("perfil", "m", { purchaseUnitCode: "barra", packageQuantity: "6", purchaseUnitCost: "120" }),
      kit: material("kit", "un", { purchaseUnitCode: "cx", packageQuantity: "10", purchaseUnitCost: "300" }),
    },
    laborRates: {
      serralheria: { id: "serralheria", name: "Serralheria", hourlyCost: "60" },
      instalador: { id: "instalador", name: "Instalação", hourlyCost: "80" },
    },
    overheadRates: [
      { id: "oh1", name: "Despesas fixas", method: "percentual_custo_direto", rate: "10" },
      { id: "oh2", name: "Energia e máquinas", method: "valor_por_hora_mo", rate: "15" },
    ],
    saleDeductions: [
      { id: "t1", name: "Simples Nacional", kind: "tributo", percent: "10" },
      { id: "t2", name: "Comissão", kind: "comissao", percent: "5" },
    ],
    parameters: { targetMarginPercent: "20", discountPercent: "0", freightAmount: "100", otherCostsAmount: "0" },
    ...overrides,
  };
}

function ok(result: ReturnType<typeof calculateQuote>): CostingSuccess {
  if (!result.ok) throw new Error(`Cálculo falhou: ${result.errors.join("; ")}`);
  return result;
}

describe("motor de custos", () => {
  it("calcula consumo, mão de obra, rateios, preço e margens", () => {
    const r = ok(calculateQuote(input()));
    expect(r.engineVersion).toBe(ENGINE_VERSION);

    const t = r.totals;
    expect(t.materialCost.toFixed(2)).toBe("1048.00"); // 660 + 252 + 76 + 60
    expect(t.laborCost.toFixed(2)).toBe("60.00"); // 1 h × 60
    expect(t.installationCost.toFixed(2)).toBe("106.67"); // 80 min × 80/h
    expect(t.freightCost.toFixed(2)).toBe("100.00");
    expect(t.overheadCost.toFixed(2)).toBe("156.47"); // 10% × 1214,67 + 15 × 2,333 h
    expect(t.variableCost.toFixed(2)).toBe("1314.67");
    expect(t.totalCost.toFixed(2)).toBe("1471.13");

    const it0 = r.items[0];
    expect(it0.unitListPrice.toFixed(2)).toBe("1131.64"); // 735,5667 / 0,65
    expect(it0.totalListPrice.toFixed(2)).toBe("2263.28");
    expect(t.listPrice.toFixed(2)).toBe("2263.28");
    expect(t.finalPrice.toFixed(2)).toBe("2263.28");
    expect(t.saleDeductionsAmount.toFixed(2)).toBe("339.49");
    expect(t.contributionMargin.toFixed(2)).toBe("609.12");
    expect(t.netProfit.toFixed(2)).toBe("452.66");
    expect(t.netMarginPercent.toDecimalPlaces(2).toFixed(2)).toBe("20.00");
    expect(t.breakEvenPrice.toFixed(2)).toBe("1730.75");
  });

  it("registra linhas de material com quantidades líquida e bruta", () => {
    const r = ok(calculateQuote(input()));
    const glass = r.lines.find((l) => l.productComponentId === "c1")!;
    expect(glass.quantityNet?.toString()).toBe("4");
    expect(glass.quantityGross?.toString()).toBe("4.4");
    expect(glass.amount.toString()).toBe("660");
    const crossbar = r.lines.find((l) => l.productComponentId === "c3")!;
    expect(crossbar.quantityNet?.toString()).toBe("3.8"); // 2 × (1 m − 0,05 m) × 2 un
  });

  it("estima necessidade de compra arredondada à unidade de compra", () => {
    const r = ok(calculateQuote(input()));
    const byCode = Object.fromEntries(r.purchaseNeeds.map((n) => [n.materialCode, n]));
    expect(byCode.PERFIL.grossConsumption.toString()).toBe("16.4");
    expect(byCode.PERFIL.purchaseQuantity.toString()).toBe("3");
    expect(byCode.PERFIL.leftoverQuantity.toString()).toBe("1.6");
    expect(byCode.VIDRO.purchaseQuantity.toString()).toBe("5");
    expect(byCode.KIT.purchaseQuantity.toString()).toBe("1");
    expect(r.totals.purchaseNeedCost.toFixed(2)).toBe("1410.00"); // 750 + 360 + 300
  });

  it("ignora a instalação quando o item não a inclui", () => {
    const r = ok(calculateQuote(input({ items: [item({ includeInstallation: false })] })));
    expect(r.totals.installationCost.toString()).toBe("0");
    expect(r.lines.some((l) => l.lineType === "instalacao")).toBe(false);
  });

  it("aplica desconto sobre o preço recomendado e alerta sobre a margem", () => {
    const r = ok(calculateQuote(input({ parameters: { ...input().parameters, discountPercent: "5" } })));
    expect(r.totals.discountAmount.toFixed(2)).toBe("113.16");
    expect(r.totals.finalPrice.toFixed(2)).toBe("2150.12");
    expect(r.totals.netMarginPercent.lt(20)).toBe(true);
    expect(r.warnings).toContain("O desconto concedido reduz a margem líquida abaixo da margem desejada.");
  });

  it("rateia frete e outros custos proporcionalmente ao custo direto", () => {
    const r = ok(
      calculateQuote(
        input({
          items: [item(), item({ quoteItemId: "qi-2", position: 2, quantity: "1", includeInstallation: false, widthMm: 500, heightMm: 500 })],
          parameters: { targetMarginPercent: "20", discountPercent: "0", freightAmount: "100", otherCostsAmount: "50" },
        }),
      ),
    );
    expect(r.totals.freightCost.toFixed(2)).toBe("100.00");
    expect(r.totals.otherCost.toFixed(2)).toBe("50.00");
    expect(r.items[0].allocatedFreight.gt(r.items[1].allocatedFreight)).toBe(true);
  });

  it("não sofre erros de ponto flutuante", () => {
    const r = ok(
      calculateQuote(
        input({
          items: [item({ quantity: "3", includeInstallation: false })],
          materials: {
            ...input().materials,
            kit: material("kit", "un", { purchaseUnitCode: "un", packageQuantity: "1", purchaseUnitCost: "0.1" }),
          },
        }),
      ),
    );
    const kit = r.lines.find((l) => l.productComponentId === "c4")!;
    expect(kit.amount.toString()).toBe("0.3"); // 3 × 0,1 exato
  });

  it("converte para a unidade de consumo do material (mm)", () => {
    const r = ok(
      calculateQuote(
        input({
          materials: {
            ...input().materials,
            perfil: material("perfil", "mm", { purchaseUnitCode: "barra", packageQuantity: "6000", purchaseUnitCost: "120" }),
          },
        }),
      ),
    );
    const frame = r.lines.find((l) => l.productComponentId === "c2")!;
    expect(frame.quantityNet?.toString()).toBe("12000");
    expect(r.totals.materialCost.toFixed(2)).toBe("1048.00");
  });

  describe("erros que impedem o cálculo", () => {
    it("material sem oferta", () => {
      const r = calculateQuote(input({ materials: { ...input().materials, kit: material("kit", "un", null) } }));
      expect(r.ok).toBe(false);
      expect(!r.ok && r.errors[0]).toMatch(/KIT não possui oferta/);
    });

    it("medidas ausentes ou fora dos limites", () => {
      expect(calculateQuote(input({ items: [item({ widthMm: null })] })).ok).toBe(false);
      const r = calculateQuote(input({ items: [item({ widthMm: 200 })] }));
      expect(!r.ok && r.errors[0]).toMatch(/largura mínima 300 mm/);
    });

    it("ajuste que torna a medida não positiva", () => {
      const v = { ...version, minWidthMm: null, components: [{ ...version.components[2], offsetMm: "-100" }] };
      const r = calculateQuote(input({ items: [item({ widthMm: 100, version: v })] }));
      expect(!r.ok && r.errors[0]).toMatch(/não é positiva/);
    });

    it("base incompatível com a unidade do material", () => {
      const v = { ...version, components: [{ ...version.components[0], materialId: "kit" }] };
      const r = calculateQuote(input({ items: [item({ version: v })] }));
      expect(!r.ok && r.errors[0]).toMatch(/exige unidade de area/);
    });

    it("margem + deduções ≥ 100%", () => {
      const r = calculateQuote(input({ parameters: { ...input().parameters, targetMarginPercent: "85" } }));
      expect(!r.ok && r.errors[0]).toMatch(/menor que 100%/);
    });

    it("orçamento sem itens", () => {
      expect(calculateQuote(input({ items: [] })).ok).toBe(false);
    });
  });

  it("produto sem medidas aceita apenas base fixa", () => {
    const v: ProductVersionSpec = {
      ...version,
      requiresDimensions: false,
      components: [version.components[3]],
      laborOperations: [],
    };
    const r = ok(calculateQuote(input({ items: [item({ widthMm: null, heightMm: null, version: v, includeInstallation: false })] })));
    expect(r.totals.materialCost.toFixed(2)).toBe("60.00");
    const bad = calculateQuote(
      input({ items: [item({ widthMm: null, heightMm: null, version: { ...v, components: [version.components[0]] } })] }),
    );
    expect(bad.ok).toBe(false);
  });
});
