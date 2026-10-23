import { z } from "zod";

import { dec } from "@/domain/shared/decimal";

import {
  checkbox,
  decimal,
  isoDate,
  optionalCnpj,
  optionalDecimal,
  optionalEmail,
  optionalInteger,
  optionalIsoDate,
  optionalText,
  optionalUuid,
  percent,
  requiredText,
  uuid,
} from "@/domain/shared/schemas";

const unitCode = (label: string) =>
  z.string({ message: `Selecione ${label}.` }).regex(/^[a-z0-9_]{1,16}$/, `Selecione ${label}.`);

export const materialSchema = z
  .object({
    internal_code: requiredText("o código interno", 40).regex(
      /^[A-Za-z0-9._/-]+$/,
      "Use apenas letras, números, ponto, hífen, barra ou sublinhado.",
    ),
    description: requiredText("a descrição", 200),
    category_id: uuid("a categoria"),
    product_line_id: optionalUuid(),
    purchase_unit_code: unitCode("a unidade de compra"),
    consumption_unit_code: unitCode("a unidade de consumo"),
    conversion_factor: decimal({ label: "o fator de conversão", gt: "0", maxScale: 6 }),
    commercial_length_mm: optionalInteger("o comprimento comercial", { min: 1, max: 100000 }),
    notes: optionalText(),
    active: checkbox(),
  })
  .refine((v) => v.purchase_unit_code !== v.consumption_unit_code || dec(v.conversion_factor).eq(1), {
    message: "Com unidades de compra e consumo iguais, o fator deve ser 1.",
    path: ["conversion_factor"],
  });
export type MaterialInput = z.infer<typeof materialSchema>;

export const supplierSchema = z.object({
  legal_name: requiredText("a razão social", 200),
  trade_name: optionalText(200),
  cnpj: optionalCnpj(),
  payment_terms: optionalText(500),
  notes: optionalText(),
  active: checkbox(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const supplierContactSchema = z.object({
  name: requiredText("o nome do contato", 120),
  role: optionalText(120),
  email: optionalEmail(),
  phone: optionalText(40),
  is_primary: checkbox(),
});
export type SupplierContactInput = z.infer<typeof supplierContactSchema>;

export const offerSchema = z
  .object({
    supplier_id: uuid("o fornecedor"),
    material_id: uuid("o material"),
    supplier_item_code: optionalText(60),
    purchase_unit_code: unitCode("a unidade de compra"),
    package_quantity: decimal({ label: "a quantidade por unidade de compra", gt: "0", maxScale: 6 }),
    price: decimal({ label: "o preço", min: "0", maxScale: 4 }),
    discount_percent: percent("o desconto"),
    purchase_tax_percent: percent("os tributos não recuperáveis", { allowHundred: true }),
    freight_per_unit: optionalDecimal({ label: "o frete", min: "0", maxScale: 4 }),
    minimum_order_quantity: optionalDecimal({ label: "o pedido mínimo", gt: "0", maxScale: 6 }),
    quoted_at: isoDate("a data da cotação"),
    valid_until: optionalIsoDate("a validade"),
    is_preferred: checkbox(),
    active: checkbox(),
    notes: optionalText(),
  })
  .refine((v) => !v.valid_until || v.valid_until >= v.quoted_at, {
    message: "A validade não pode ser anterior à data da cotação.",
    path: ["valid_until"],
  });
export type OfferInput = z.infer<typeof offerSchema>;
