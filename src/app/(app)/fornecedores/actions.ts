"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { supplierContactSchema, supplierSchema } from "@/domain/catalog/schemas";
import { formDataToObject } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, validationError, type ActionState } from "@/server/actions";
import { requireRole } from "@/server/auth";
import { runAction } from "@/server/guard";

export async function saveSupplier(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = supplierSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    if (id) {
      const { error } = await db.from("suppliers").update(parsed.data).eq("id", id);
      if (error) return databaseError(error);
    } else {
      const { data, error } = await db.from("suppliers").insert(parsed.data).select("id").single();
      if (error) return databaseError(error);
      createdId = data.id;
    }
    revalidatePath("/fornecedores");
    return { ok: true, message: "Fornecedor salvo." };
  });
  if (createdId) redirect(`/fornecedores/${createdId}`);
  return result;
}

export async function addSupplierContact(supplierId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = supplierContactSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    if (parsed.data.is_primary) {
      const { error } = await db
        .from("supplier_contacts")
        .update({ is_primary: false })
        .eq("supplier_id", supplierId)
        .eq("is_primary", true);
      if (error) return databaseError(error);
    }
    const { error } = await db.from("supplier_contacts").insert({ ...parsed.data, supplier_id: supplierId });
    if (error) return databaseError(error);
    revalidatePath(`/fornecedores/${supplierId}`);
    return { ok: true, message: "Contato adicionado." };
  });
}

export async function removeSupplierContact(supplierId: string, contactId: string) {
  await requireRole("admin", "gestor");
  const db = await createClient();
  await db.from("supplier_contacts").delete().eq("id", contactId).eq("supplier_id", supplierId);
  revalidatePath(`/fornecedores/${supplierId}`);
}
