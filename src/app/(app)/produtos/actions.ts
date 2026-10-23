"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { componentSchema, laborOperationSchema, productSchema, versionLimitsSchema } from "@/domain/products/schemas";
import { formDataToObject, optionalText } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, describeDatabaseError, validationError, type ActionState } from "@/server/actions";
import { requireRole } from "@/server/auth";
import { runAction } from "@/server/guard";

export async function saveProduct(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = productSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    if (id) {
      const { error } = await db.from("products").update(parsed.data).eq("id", id);
      if (error) return databaseError(error);
    } else {
      const { data, error } = await db.from("products").insert(parsed.data).select("id").single();
      if (error) return databaseError(error);
      createdId = data.id;
    }
    revalidatePath("/produtos");
    return { ok: true, message: "Produto salvo." };
  });
  if (createdId) redirect(`/produtos/${createdId}`);
  return result;
}

/** Cria rascunho (vazio ou copiando uma versão) e abre o editor. */
export async function createDraft(productId: string, sourceVersionId: string | null) {
  await requireRole("admin", "gestor");
  const db = await createClient();
  const { data, error } = await db.rpc("create_product_version_draft", {
    p_product_id: productId,
    ...(sourceVersionId ? { p_source_version_id: sourceVersionId } : {}),
  });
  if (error) redirect(`/produtos/${productId}?erro=${encodeURIComponent(describeDatabaseError(error))}`);
  revalidatePath(`/produtos/${productId}`);
  redirect(`/produtos/${productId}/versoes/${data}`);
}

function versionPath(productId: string, versionId: string) {
  return `/produtos/${productId}/versoes/${versionId}`;
}

export async function saveVersionLimits(productId: string, versionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = versionLimitsSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { error } = await db.from("product_versions").update(parsed.data).eq("id", versionId);
    if (error) return databaseError(error);
    revalidatePath(versionPath(productId, versionId));
    return { ok: true, message: "Limites salvos." };
  });
}

export async function addComponent(productId: string, versionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = componentSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { position, ...rest } = parsed.data;
    const { error } = await db
      .from("product_components")
      .insert({ ...rest, position: position ?? 0, product_version_id: versionId });
    if (error) return databaseError(error);
    revalidatePath(versionPath(productId, versionId));
    return { ok: true, message: "Componente adicionado." };
  });
}

export async function removeComponent(productId: string, versionId: string, componentId: string) {
  await requireRole("admin", "gestor");
  const db = await createClient();
  await db.from("product_components").delete().eq("id", componentId).eq("product_version_id", versionId);
  revalidatePath(versionPath(productId, versionId));
}

export async function addOperation(productId: string, versionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole("admin", "gestor");
    const parsed = laborOperationSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { position, ...rest } = parsed.data;
    const { error } = await db
      .from("product_labor_operations")
      .insert({ ...rest, position: position ?? 0, product_version_id: versionId });
    if (error) return databaseError(error);
    revalidatePath(versionPath(productId, versionId));
    return { ok: true, message: "Operação adicionada." };
  });
}

export async function removeOperation(productId: string, versionId: string, operationId: string) {
  await requireRole("admin", "gestor");
  const db = await createClient();
  await db.from("product_labor_operations").delete().eq("id", operationId).eq("product_version_id", versionId);
  revalidatePath(versionPath(productId, versionId));
}

export async function publishVersion(productId: string, versionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    await requireRole("admin", "gestor");
    const summary = optionalText(500).safeParse(formData.get("change_summary"));
    const db = await createClient();
    const { error } = await db.rpc("publish_product_version", {
      p_version_id: versionId,
      ...(summary.success && summary.data ? { p_change_summary: summary.data } : {}),
    });
    if (error) return databaseError(error);
    revalidatePath(`/produtos/${productId}`);
    return { ok: true, message: "Versão publicada." };
  });
  if (result.ok) redirect(versionPath(productId, versionId));
  return result;
}

export async function deleteDraft(productId: string, versionId: string) {
  await requireRole("admin", "gestor");
  const db = await createClient();
  const { error } = await db.from("product_versions").delete().eq("id", versionId).eq("status", "rascunho");
  if (error) redirect(`${versionPath(productId, versionId)}?erro=${encodeURIComponent(describeDatabaseError(error))}`);
  revalidatePath(`/produtos/${productId}`);
  redirect(`/produtos/${productId}`);
}
