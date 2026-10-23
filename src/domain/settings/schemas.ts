import { z } from "zod";

import { checkbox, decimal, integer, optionalText, percent, requiredText } from "@/domain/shared/schemas";

export const laborRateSchema = z.object({
  name: requiredText("o nome", 120),
  description: optionalText(500),
  hourly_cost: decimal({ label: "o custo por hora", min: "0", maxScale: 4 }),
  active: checkbox(),
});

export const overheadRateSchema = z
  .object({
    name: requiredText("o nome", 120),
    method: z.enum(["percentual_custo_direto", "valor_por_hora_mo"], { message: "Selecione o método." }),
    rate: decimal({ label: "a taxa", min: "0", maxScale: 4 }),
    notes: optionalText(500),
    active: checkbox(),
  })
  .refine((v) => v.method !== "percentual_custo_direto" || Number(v.rate) <= 1000, {
    message: "Percentual acima de 1000%.",
    path: ["rate"],
  });

export const saleDeductionSchema = z.object({
  name: requiredText("o nome", 120),
  kind: z.enum(["tributo", "comissao", "taxa_financeira", "outro"], { message: "Selecione o tipo." }),
  percent: percent("o percentual"),
  notes: optionalText(500),
  active: checkbox(),
});

export const companySettingsSchema = z.object({
  company_name: optionalText(200),
  default_target_margin_percent: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), percent("a margem padrão").optional())
    .transform((v) => v ?? null),
  price_stale_after_days: integer("o prazo de preço desatualizado", { min: 1, max: 3650 }),
  quote_validity_days: integer("a validade padrão", { min: 1, max: 365 }),
  default_payment_terms: optionalText(500),
  proposal_footer: optionalText(2000),
});

export const profileUpdateSchema = z.object({
  full_name: optionalText(200).transform((v) => v ?? ""),
  role: z.enum(["admin", "gestor", "vendedor"], { message: "Selecione o papel." }),
  active: checkbox(),
  max_discount_percent: percent("o desconto máximo", { allowHundred: true }),
});

export const OVERHEAD_METHOD_LABELS = {
  percentual_custo_direto: "% sobre materiais + mão de obra",
  valor_por_hora_mo: "R$ por hora de mão de obra",
} as const;

export const SALE_DEDUCTION_KIND_LABELS = {
  tributo: "Tributo",
  comissao: "Comissão",
  taxa_financeira: "Taxa financeira",
  outro: "Outro",
} as const;
