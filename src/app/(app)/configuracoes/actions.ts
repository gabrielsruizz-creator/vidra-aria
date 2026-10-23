"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import {
  companySettingsSchema,
  laborRateSchema,
  overheadRateSchema,
  profileUpdateSchema,
  saleDeductionSchema,
} from "@/domain/settings/schemas";
import { formDataToObject } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, validationError, type ActionState } from "@/server/actions";
import { requireRole } from "@/server/auth";
import { runAction } from "@/server/guard";

type RateTable = "labor_rates" | "overhead_rates" | "sale_deduction_rates";

const CONFIG: Record<RateTable, { schema: z.ZodType<Record<string, unknown>>; path: string }> = {
  labor_rates: { schema: laborRateSchema, path: "/configuracoes/mao-de-obra" },
  overhead_rates: { schema: overheadRateSchema, path: "/configuracoes/custos-indiretos" },
  sale_deduction_rates: { schema: saleDeductionSchema, path: "/configuracoes/deducoes" },
};

async function saveRate(table: RateTable, id: string | null, formData: FormData): Promise<ActionState> {
  const { schema, path } = CONFIG[table];
  const result = await runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = schema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    // Os esquemas Zod garantem o formato de cada tabela.
    const query = id
      ? db.from(table).update(parsed.data as never).eq("id", id)
      : db.from(table).insert(parsed.data as never);
    const { error } = await query;
    if (error) return databaseError(error);
    revalidatePath(path);
    return { ok: true, message: id ? "Alterações salvas." : "Cadastro incluído." };
  });
  if (result.ok && id) redirect(path);
  return result;
}

export async function saveLaborRate(id: string | null, _prev: ActionState, formData: FormData) {
  return saveRate("labor_rates", id, formData);
}
export async function saveOverheadRate(id: string | null, _prev: ActionState, formData: FormData) {
  return saveRate("overhead_rates", id, formData);
}
export async function saveSaleDeduction(id: string | null, _prev: ActionState, formData: FormData) {
  return saveRate("sale_deduction_rates", id, formData);
}

export async function saveCompanySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole("admin");
    const parsed = companySettingsSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { error } = await db.from("company_settings").update(parsed.data).eq("id", true);
    if (error) return databaseError(error);
    revalidatePath("/configuracoes");
    return { ok: true, message: "Parâmetros salvos." };
  });
}

export async function updateProfile(profileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireRole("admin");
    const parsed = profileUpdateSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    if (profileId === me.id && (!parsed.data.active || parsed.data.role !== "admin")) {
      return { ok: false, message: "Você não pode remover o próprio acesso de administrador." };
    }
    const db = await createClient();
    const { error } = await db.from("profiles").update(parsed.data).eq("id", profileId);
    if (error) return databaseError(error);
    revalidatePath("/configuracoes/usuarios");
    return { ok: true, message: "Usuário atualizado." };
  });
}
