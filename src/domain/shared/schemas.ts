import { z } from "zod";

import { dec } from "@/domain/shared/decimal";
import { isValidCnpj, isValidCpf, onlyDigits, parseDecimalBR } from "@/lib/parse";

/**
 * Construtores de esquemas Zod para formulários (valores chegam como texto
 * do FormData). Valores decimais saem como string canônica ("1234.56").
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const requiredText = (label: string, max = 200) =>
  z
    .string({ message: `Informe ${label}.` })
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${capitalize(label)} deve ter no máximo ${max} caracteres.`);

export const optionalText = (max = 2000) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional(),
  ).transform((v) => v ?? null);

export const uuid = (label = "o registro") => z.uuid({ message: `Selecione ${label}.` });

export const optionalUuid = () =>
  z.preprocess(emptyToUndefined, z.uuid({ message: "Seleção inválida." }).optional()).transform((v) => v ?? null);

/** Checkbox HTML: presente ("on"/"true") = true; ausente = false. */
export const checkbox = () =>
  z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

type DecimalOptions = {
  label: string;
  min?: string;
  max?: string;
  /** mínimo exclusivo (valor deve ser maior que) */
  gt?: string;
  /** máximo exclusivo (valor deve ser menor que) */
  lt?: string;
  maxScale?: number;
};

function decimalRefine(value: string, opts: DecimalOptions, ctx: z.RefinementCtx): string {
  let parsed: string;
  try {
    parsed = parseDecimalBR(value);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: `${capitalize(opts.label)}: ${(e as Error).message}` });
    return z.NEVER;
  }
  const d = dec(parsed);
  const fail = (message: string) => {
    ctx.addIssue({ code: "custom", message });
    return z.NEVER;
  };
  if (opts.maxScale !== undefined && d.decimalPlaces() > opts.maxScale) {
    return fail(`${capitalize(opts.label)} aceita no máximo ${opts.maxScale} casas decimais.`);
  }
  if (opts.min !== undefined && d.lt(opts.min)) return fail(`${capitalize(opts.label)} deve ser no mínimo ${opts.min.replace(".", ",")}.`);
  if (opts.gt !== undefined && d.lte(opts.gt)) return fail(`${capitalize(opts.label)} deve ser maior que ${opts.gt.replace(".", ",")}.`);
  if (opts.max !== undefined && d.gt(opts.max)) return fail(`${capitalize(opts.label)} deve ser no máximo ${opts.max.replace(".", ",")}.`);
  if (opts.lt !== undefined && d.gte(opts.lt)) return fail(`${capitalize(opts.label)} deve ser menor que ${opts.lt.replace(".", ",")}.`);
  return parsed;
}

/** Decimal obrigatório digitado no padrão brasileiro. */
export const decimal = (opts: DecimalOptions) =>
  z
    .string({ message: `Informe ${opts.label}.` })
    .trim()
    .min(1, `Informe ${opts.label}.`)
    .transform((v, ctx) => decimalRefine(v, opts, ctx));

/** Decimal opcional: vazio -> null. */
export const optionalDecimal = (opts: DecimalOptions) =>
  z
    .preprocess(emptyToUndefined, z.string().trim().optional())
    .transform((v, ctx) => (v === undefined ? null : decimalRefine(v, opts, ctx)));

/** Percentual 0 ≤ p < 100 (ou ≤ max). */
export const percent = (label: string, opts: { max?: string; allowHundred?: boolean } = {}) =>
  decimal({ label, min: "0", ...(opts.allowHundred ? { max: opts.max ?? "100" } : { lt: opts.max ?? "100" }), maxScale: 4 });

export const integer = (label: string, opts: { min?: number; max?: number } = {}) =>
  z.coerce
    .number({ message: `Informe ${label}.` })
    .int(`${capitalize(label)} deve ser um número inteiro.`)
    .min(opts.min ?? 0, `${capitalize(label)} deve ser no mínimo ${opts.min ?? 0}.`)
    .max(opts.max ?? 2_147_483_647, `${capitalize(label)} deve ser no máximo ${opts.max}.`);

export const optionalInteger = (label: string, opts: { min?: number; max?: number } = {}) =>
  z.preprocess(emptyToUndefined, integer(label, opts).optional()).transform((v) => v ?? null);

/** Data AAAA-MM-DD (input type="date"). */
export const isoDate = (label: string) =>
  z
    .string({ message: `Informe ${label}.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Data inválida em ${label}.`)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), `Data inválida em ${label}.`);

export const optionalIsoDate = (label: string) =>
  z.preprocess(emptyToUndefined, isoDate(label).optional()).transform((v) => v ?? null);

export const optionalEmail = () =>
  z.preprocess(emptyToUndefined, z.email("E-mail inválido.").optional()).transform((v) => v ?? null);

export const optionalCnpj = () =>
  z
    .preprocess(emptyToUndefined, z.string().optional())
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const digits = onlyDigits(v);
      if (!isValidCnpj(digits)) {
        ctx.addIssue({ code: "custom", message: "CNPJ inválido." });
        return z.NEVER;
      }
      return digits;
    });

export const optionalCpfOrCnpj = () =>
  z
    .preprocess(emptyToUndefined, z.string().optional())
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const digits = onlyDigits(v);
      if (digits.length === 11 ? !isValidCpf(digits) : !isValidCnpj(digits)) {
        ctx.addIssue({ code: "custom", message: "CPF ou CNPJ inválido." });
        return z.NEVER;
      }
      return digits;
    });

/** Converte FormData em objeto simples (ignora campos internos do Next). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function capitalize(s: string): string {
  const t = s.replace(/^(o|a|os|as) /, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
