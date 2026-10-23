import { z } from "zod";

import {
  checkbox,
  decimal,
  optionalInteger,
  optionalText,
  optionalUuid,
  percent,
  requiredText,
  uuid,
} from "@/domain/shared/schemas";

const QUANTITY_BASES = ["fixa", "largura", "altura", "perimetro", "area"] as const;

export const productSchema = z.object({
  code: requiredText("o código", 40).regex(/^[A-Za-z0-9._/-]+$/, "Use apenas letras, números, ponto, hífen, barra ou sublinhado."),
  name: requiredText("o nome", 200),
  category_id: uuid("a categoria"),
  product_line_id: optionalUuid(),
  description: optionalText(),
  requires_dimensions: checkbox(),
  is_custom_size: checkbox(),
  active: checkbox(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const versionLimitsSchema = z
  .object({
    min_width_mm: optionalInteger("a largura mínima", { min: 1, max: 100000 }),
    max_width_mm: optionalInteger("a largura máxima", { min: 1, max: 100000 }),
    min_height_mm: optionalInteger("a altura mínima", { min: 1, max: 100000 }),
    max_height_mm: optionalInteger("a altura máxima", { min: 1, max: 100000 }),
    notes: optionalText(),
  })
  .refine((v) => !v.min_width_mm || !v.max_width_mm || v.min_width_mm <= v.max_width_mm, {
    message: "Largura mínima maior que a máxima.",
    path: ["max_width_mm"],
  })
  .refine((v) => !v.min_height_mm || !v.max_height_mm || v.min_height_mm <= v.max_height_mm, {
    message: "Altura mínima maior que a máxima.",
    path: ["max_height_mm"],
  });

export const componentSchema = z
  .object({
    material_id: uuid("o material"),
    description: optionalText(200),
    quantity_basis: z.enum(QUANTITY_BASES, { message: "Selecione a base de cálculo." }),
    coefficient: decimal({ label: "o coeficiente", gt: "0", maxScale: 6 }),
    offset_mm: decimal({ label: "o ajuste", min: "-100000", max: "100000", maxScale: 2 }),
    waste_percent: percent("a perda"),
    position: optionalInteger("a posição", { min: 0, max: 10000 }),
    notes: optionalText(),
  })
  .refine((v) => ["largura", "altura", "perimetro"].includes(v.quantity_basis) || Number(v.offset_mm) === 0, {
    message: "Ajuste em mm só se aplica a bases lineares (largura, altura, perímetro).",
    path: ["offset_mm"],
  });
export type ComponentInput = z.infer<typeof componentSchema>;

export const laborOperationSchema = z.object({
  labor_rate_id: uuid("a função/taxa de mão de obra"),
  stage: z.enum(["fabricacao", "instalacao"], { message: "Selecione a etapa." }),
  description: requiredText("a descrição", 200),
  time_basis: z.enum(QUANTITY_BASES, { message: "Selecione a base de tempo." }),
  minutes: decimal({ label: "os minutos", gt: "0", maxScale: 4 }),
  position: optionalInteger("a posição", { min: 0, max: 10000 }),
});
export type LaborOperationInput = z.infer<typeof laborOperationSchema>;
