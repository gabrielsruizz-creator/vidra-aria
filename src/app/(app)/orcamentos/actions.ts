"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { quoteHeaderSchema, quoteItemSchema } from "@/domain/quotes/schemas";
import { canTransition, type QuoteStatus } from "@/domain/quotes/status";
import { formDataToObject } from "@/domain/shared/schemas";
import { createClient } from "@/lib/supabase/server";
import { databaseError, describeDatabaseError, validationError, type ActionState } from "@/server/actions";
import { requireMember } from "@/server/auth";
import { runAction } from "@/server/guard";
import { unwrap, unwrapMaybe } from "@/server/repositories/util";
import { calculateAndSaveQuote } from "@/server/services/quote-calculation";

const quotePath = (id: string) => `/orcamentos/${id}`;
const withError = (path: string, message: string) => `${path}?erro=${encodeURIComponent(message)}`;

export async function createQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    await requireMember();
    const parsed = quoteHeaderSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { data, error } = await db.from("quotes").insert(parsed.data).select("id").single();
    if (error) return databaseError(error);
    createdId = data.id;
    revalidatePath("/orcamentos");
    return { ok: true };
  });
  if (createdId) redirect(quotePath(createdId));
  return result;
}

export async function updateQuoteHeader(quoteId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireMember();
    const parsed = quoteHeaderSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();
    const { data, error } = await db.from("quotes").update(parsed.data).eq("id", quoteId).select("id");
    if (error) return databaseError(error);
    if (!data?.length) return { ok: false, message: "Você não pode editar este orçamento." };
    revalidatePath(quotePath(quoteId));
    return { ok: true, message: "Dados salvos. Recalcule para atualizar custos e preços." };
  });
}

export async function updateInternalNotes(quoteId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireMember();
    const notes = String(formData.get("internal_notes") ?? "").trim().slice(0, 2000) || null;
    const db = await createClient();
    const { error } = await db.from("quotes").update({ internal_notes: notes }).eq("id", quoteId);
    if (error) return databaseError(error);
    revalidatePath(quotePath(quoteId));
    return { ok: true, message: "Observações salvas." };
  });
}

export async function addQuoteItem(quoteId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireMember();
    const parsed = quoteItemSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);
    const db = await createClient();

    // Sempre usa a versão publicada vigente no momento da inclusão.
    const version = unwrapMaybe(
      await db
        .from("product_versions")
        .select("id, product:products(requires_dimensions)")
        .eq("product_id", parsed.data.product_id)
        .eq("status", "publicada")
        .maybeSingle(),
    );
    if (!version) return { ok: false, message: "O produto não tem ficha técnica publicada." };
    const requiresDimensions = version.product?.requires_dimensions ?? true;
    if (requiresDimensions && (!parsed.data.width_mm || !parsed.data.height_mm)) {
      return { ok: false, message: "Informe largura e altura.", fieldErrors: { width_mm: ["Obrigatório."], height_mm: ["Obrigatório."] } };
    }
    const last = unwrap(
      await db.from("quote_items").select("position").eq("quote_id", quoteId).order("position", { ascending: false }).limit(1),
    );
    const { error } = await db.from("quote_items").insert({
      ...parsed.data,
      width_mm: requiresDimensions ? parsed.data.width_mm : null,
      height_mm: requiresDimensions ? parsed.data.height_mm : null,
      quote_id: quoteId,
      product_version_id: version.id,
      position: (last[0]?.position ?? 0) + 1,
    });
    if (error) return databaseError(error);
    revalidatePath(quotePath(quoteId));
    return { ok: true, message: "Item adicionado. Recalcule o orçamento." };
  });
}

export async function removeQuoteItem(quoteId: string, itemId: string) {
  await requireMember();
  const db = await createClient();
  const { error } = await db.from("quote_items").delete().eq("id", itemId).eq("quote_id", quoteId);
  revalidatePath(quotePath(quoteId));
  if (error) redirect(withError(quotePath(quoteId), describeDatabaseError(error)));
}

export type CalculationState = ActionState & { errors?: string[]; warnings?: string[] };

export async function calculateQuoteAction(quoteId: string, _prev: CalculationState): Promise<CalculationState> {
  const result = await runAction(async () => {
    await requireMember();
    const db = await createClient();
    const outcome = await calculateAndSaveQuote(db, quoteId);
    if (!outcome.ok) {
      return { ok: false, message: "O cálculo não pôde ser concluído.", errors: outcome.errors } as CalculationState;
    }
    revalidatePath(quotePath(quoteId));
    revalidatePath("/orcamentos");
    revalidatePath("/dashboard");
    return { ok: true, message: "Cálculo salvo como nova fotografia de custos.", warnings: outcome.warnings } as CalculationState;
  });
  return result as CalculationState;
}

export async function changeQuoteStatus(quoteId: string, from: QuoteStatus, to: QuoteStatus) {
  await requireMember();
  if (!canTransition(from, to)) redirect(withError(quotePath(quoteId), "Transição de status inválida."));
  const db = await createClient();
  const { data, error } = await db.from("quotes").update({ status: to }).eq("id", quoteId).eq("status", from).select("id");
  revalidatePath(quotePath(quoteId));
  revalidatePath("/orcamentos");
  revalidatePath("/dashboard");
  if (error) redirect(withError(quotePath(quoteId), describeDatabaseError(error)));
  if (!data?.length) {
    redirect(withError(quotePath(quoteId), "Status não alterado: o orçamento mudou ou você não tem permissão."));
  }
}

/** Cria um novo rascunho com os mesmos itens, usando as fichas publicadas atuais. */
export async function duplicateQuote(quoteId: string) {
  await requireMember();
  const db = await createClient();
  const original = unwrap(await db.from("quotes").select("*").eq("id", quoteId).single());
  const items = unwrap(await db.from("quote_items").select("*").eq("quote_id", quoteId).order("position"));
  const productIds = [...new Set(items.map((i) => i.product_id))];
  const versions = productIds.length
    ? unwrap(
        await db.from("product_versions").select("id, product_id").in("product_id", productIds).eq("status", "publicada"),
      )
    : [];

  const { data: created, error } = await db
    .from("quotes")
    .insert({
      customer_id: original.customer_id,
      title: original.title ? `${original.title} (cópia)` : null,
      target_margin_percent: original.target_margin_percent,
      discount_percent: 0,
      freight_amount: original.freight_amount,
      other_costs_amount: original.other_costs_amount,
      other_costs_description: original.other_costs_description,
      payment_terms: original.payment_terms,
      delivery_terms: original.delivery_terms,
      customer_notes: original.customer_notes,
    })
    .select("id")
    .single();
  if (error) redirect(withError(quotePath(quoteId), describeDatabaseError(error)));

  const rows = items.flatMap((i) => {
    const v = versions.find((x) => x.product_id === i.product_id);
    if (!v) return [];
    return [
      {
        quote_id: created.id,
        position: i.position,
        product_id: i.product_id,
        product_version_id: v.id,
        description: i.description,
        width_mm: i.width_mm,
        height_mm: i.height_mm,
        quantity: i.quantity,
        include_installation: i.include_installation,
        extra_cost: i.extra_cost,
        extra_cost_description: i.extra_cost_description,
        notes: i.notes,
      },
    ];
  });
  if (rows.length) {
    const { error: itemsError } = await db.from("quote_items").insert(rows);
    if (itemsError) redirect(withError(quotePath(created.id), describeDatabaseError(itemsError)));
  }
  revalidatePath("/orcamentos");
  const skipped = items.length - rows.length;
  redirect(
    skipped > 0
      ? withError(quotePath(created.id), `${skipped} item(ns) não copiado(s): produto sem ficha publicada.`)
      : quotePath(created.id),
  );
}

export async function deleteQuote(quoteId: string) {
  await requireMember();
  const db = await createClient();
  const { error } = await db.from("quotes").delete().eq("id", quoteId);
  if (error) redirect(withError(quotePath(quoteId), describeDatabaseError(error)));
  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
