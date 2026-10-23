import { describe, expect, it } from "vitest";

import { materialSchema, offerSchema, supplierSchema } from "./schemas";

const ids = {
  category: "8c1d7f5e-6a8b-4c2d-9e3f-1a2b3c4d5e6f",
  supplier: "1c1d7f5e-6a8b-4c2d-9e3f-1a2b3c4d5e6f",
  material: "2c1d7f5e-6a8b-4c2d-9e3f-1a2b3c4d5e6f",
};

describe("materialSchema", () => {
  const base = {
    internal_code: "PERF-001",
    description: "Perfil de teste",
    category_id: ids.category,
    product_line_id: "",
    purchase_unit_code: "barra",
    consumption_unit_code: "m",
    conversion_factor: "6",
    commercial_length_mm: "6000",
    notes: "",
    active: "on",
  };

  it("aceita material válido", () => {
    expect(materialSchema.parse(base)).toMatchObject({
      conversion_factor: "6",
      commercial_length_mm: 6000,
      product_line_id: null,
      active: true,
    });
  });

  it("exige fator 1 quando as unidades são iguais", () => {
    const r = materialSchema.safeParse({ ...base, purchase_unit_code: "m" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["conversion_factor"]);
  });

  it("rejeita código com espaços", () => {
    expect(materialSchema.safeParse({ ...base, internal_code: "PERF 001" }).success).toBe(false);
  });
});

describe("supplierSchema", () => {
  it("CNPJ é opcional", () => {
    expect(supplierSchema.parse({ legal_name: "Fornecedor Ltda", cnpj: "" }).cnpj).toBeNull();
  });
});

describe("offerSchema", () => {
  const base = {
    supplier_id: ids.supplier,
    material_id: ids.material,
    purchase_unit_code: "barra",
    package_quantity: "6",
    price: "1.234,50",
    discount_percent: "0",
    purchase_tax_percent: "0",
    freight_per_unit: "",
    quoted_at: "2026-10-01",
    valid_until: "",
    active: "on",
  };

  it("normaliza valores e frete desconhecido", () => {
    expect(offerSchema.parse(base)).toMatchObject({ price: "1234.50", freight_per_unit: null, valid_until: null });
  });

  it("rejeita validade anterior à cotação", () => {
    expect(offerSchema.safeParse({ ...base, valid_until: "2026-09-01" }).success).toBe(false);
  });

  it("rejeita desconto de 100%", () => {
    expect(offerSchema.safeParse({ ...base, discount_percent: "100" }).success).toBe(false);
  });
});
