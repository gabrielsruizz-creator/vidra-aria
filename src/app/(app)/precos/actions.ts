"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { offerSchema } from "@/domain/catalog/schemas";
import { formDataToObject } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, validationError, type ActionState } from "@/server/actions";
import { requireRole } from "@/server/auth";
import { runAction } from "@/server/guard";

export async function saveOffer(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = offerSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const data = parsed.data;
    const db = await createClient();

    // Só uma preferencial ativa por material: desmarca a anterior.
    if (data.is_preferred && data.active) {
      let reset = db
        .from("supplier_material_offers")
        .update({ is_preferred: false })
        .eq("material_id", data.material_id)
        .eq("is_preferred", true);
      if (id) reset = reset.neq("id", id);
      const { error } = await reset;
      if (error) return databaseError(error);
    }

    if (id) {
      // Fornecedor e material não mudam (regra também garantida no banco).
      const { supplier_id: _s, material_id: _m, ...changes } = data;
      void _s;
      void _m;
      const { error } = await db.from("supplier_material_offers").update(changes).eq("id", id);
      if (error) return databaseError(error);
    } else {
      const { data: row, error } = await db.from("supplier_material_offers").insert(data).select("id").single();
      if (error) return databaseError(error);
      createdId = row.id;
    }
    revalidatePath("/precos");
    revalidatePath(`/materiais/${data.material_id}`);
    revalidatePath(`/fornecedores/${data.supplier_id}`);
    return { ok: true, message: "Oferta salva. A alteração de preço foi registrada no histórico." };
  });
  if (createdId) redirect(`/precos/${createdId}`);
  return result;
}
