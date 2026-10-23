import { z } from "zod";

import { checkbox, optionalCpfOrCnpj, optionalEmail, optionalText, requiredText } from "@/domain/shared/schemas";
import { onlyDigits } from "@/lib/parse";

export const customerSchema = z
  .object({
    person_type: z.enum(["fisica", "juridica"], { message: "Selecione o tipo de pessoa." }),
    name: requiredText("o nome", 200),
    trade_name: optionalText(200),
    document: optionalCpfOrCnpj(),
    email: optionalEmail(),
    phone: optionalText(40),
    address_street: optionalText(200),
    address_number: optionalText(20),
    address_complement: optionalText(100),
    address_district: optionalText(100),
    address_city: optionalText(100),
    address_state: z
      .preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined), z.string().regex(/^[A-Z]{2}$/, "UF inválida.").optional())
      .transform((v) => v ?? null),
    address_postal_code: z
      .preprocess((v) => (typeof v === "string" && v.trim() ? onlyDigits(v) : undefined), z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos.").optional())
      .transform((v) => v ?? null),
    notes: optionalText(),
    active: checkbox(),
  })
  .refine(
    (v) => !v.document || (v.person_type === "fisica" ? v.document.length === 11 : v.document.length === 14),
    { message: "Pessoa física usa CPF; pessoa jurídica usa CNPJ.", path: ["document"] },
  );
export type CustomerInput = z.infer<typeof customerSchema>;
