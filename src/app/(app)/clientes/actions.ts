"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { customerSchema } from "@/domain/customers/schemas";
import { formDataToObject } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, validationError, type ActionState } from "@/server/actions";
import { requireMember } from "@/server/auth";
import { runAction } from "@/server/guard";

export async function saveCustomer(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const returnTo = formData.get("return_to");
  const result = await runAction(async () => {
    await requireMember();
    const parsed = customerSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    if (id) {
      const { error } = await db.from("customers").update(parsed.data).eq("id", id);
      if (error) return databaseError(error);
    } else {
      const { data, error } = await db.from("customers").insert(parsed.data).select("id").single();
      if (error) return databaseError(error);
      createdId = data.id;
    }
    revalidatePath("/clientes");
    return { ok: true, message: "Cliente salvo." };
  });
  if (createdId) {
    redirect(returnTo === "orcamento" ? `/orcamentos/novo?cliente=${createdId}` : `/clientes/${createdId}`);
  }
  return result;
}
