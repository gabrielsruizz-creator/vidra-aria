import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, unwrap, unwrapMaybe } from "./util";

export async function listSuppliers(
  db: SupabaseServerClient,
  filters: { q?: string; status?: "ativos" | "inativos" | "todos" } = {},
) {
  let query = db
    .from("suppliers")
    .select("id, legal_name, trade_name, cnpj, payment_terms, active, contacts:supplier_contacts(name, phone, email, is_primary), offers:supplier_material_offers(count)")
    .order("legal_name");
  if (filters.q?.trim()) {
    const p = ilikePattern(filters.q);
    const ors = [`legal_name.ilike.${p}`, `trade_name.ilike.${p}`];
    const digits = filters.q.replace(/\D/g, "");
    if (digits.length >= 3) ors.push(`cnpj.ilike.%${digits}%`);
    query = query.or(ors.join(","));
  }
  const status = filters.status ?? "ativos";
  if (status !== "todos") query = query.eq("active", status === "ativos");
  return unwrap(await query.limit(500));
}

export async function getSupplier(db: SupabaseServerClient, id: string) {
  return unwrapMaybe(await db.from("suppliers").select("*").eq("id", id).maybeSingle());
}

export async function listSupplierContacts(db: SupabaseServerClient, supplierId: string) {
  return unwrap(
    await db
      .from("supplier_contacts")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("is_primary", { ascending: false })
      .order("name"),
  );
}

export async function listSupplierOptions(db: SupabaseServerClient) {
  return unwrap(await db.from("suppliers").select("id, legal_name, trade_name").eq("active", true).order("legal_name"));
}
