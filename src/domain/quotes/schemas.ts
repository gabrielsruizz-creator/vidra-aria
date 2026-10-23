import { z } from "zod";

import {
  checkbox,
  decimal,
  isoDate,
  optionalDecimal,
  optionalInteger,
  optionalIsoDate,
  optionalText,
  percent,
  uuid,
} from "@/domain/shared/schemas";

export const quoteHeaderSchema = z
  .object({
    customer_id: uuid("o cliente"),
    title: optionalText(200),
    issue_date: isoDate("a data de emissão"),
    valid_until: optionalIsoDate("a validade"),
    target_margin_percent: percent("a margem desejada"),
    discount_percent: percent("o desconto"),
    freight_amount: decimal({ label: "o frete", min: "0", maxScale: 2 }),
    other_costs_amount: decimal({ label: "os outros custos", min: "0", maxScale: 2 }),
    other_costs_description: optionalText(300),
    payment_terms: optionalText(1000),
    delivery_terms: optionalText(1000),
    customer_notes: optionalText(2000),
    internal_notes: optionalText(2000),
  })
  .refine((v) => !v.valid_until || v.valid_until >= v.issue_date, {
    message: "A validade não pode ser anterior à emissão.",
    path: ["valid_until"],
  });
export type QuoteHeaderInput = z.infer<typeof quoteHeaderSchema>;

export const quoteItemSchema = z.object({
  product_id: uuid("o produto"),
  description: optionalText(300),
  width_mm: optionalInteger("a largura", { min: 1, max: 100000 }),
  height_mm: optionalInteger("a altura", { min: 1, max: 100000 }),
  quantity: decimal({ label: "a quantidade", gt: "0", maxScale: 3 }),
  include_installation: checkbox(),
  extra_cost: optionalDecimal({ label: "o custo específico", min: "0", maxScale: 2 }).transform((v) => v ?? "0"),
  extra_cost_description: optionalText(300),
  notes: optionalText(1000),
});
export type QuoteItemInputForm = z.infer<typeof quoteItemSchema>;
