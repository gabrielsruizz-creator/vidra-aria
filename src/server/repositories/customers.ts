import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, unwrap, unwrapMaybe } from "./util";

export async function listCustomers(db: SupabaseServerClient, filters: { q?: string; status?: "ativos" | "inativos" | "todos" } = {}) {
  let query = db
    .from("customers")
    .select("id, person_type, name, trade_name, document, email, phone, address_city, address_state, active")
    .order("name");
  if (filters.q?.trim()) {
    const p = ilikePattern(filters.q);
    const ors = [`name.ilike.${p}`, `trade_name.ilike.${p}`, `email.ilike.${p}`];
    const digits = filters.q.replace(/\D/g, "");
    if (digits.length >= 3) ors.push(`document.ilike.%${digits}%`);
    query = query.or(ors.join(","));
  }
  const status = filters.status ?? "ativos";
  if (status !== "todos") query = query.eq("active", status === "ativos");
  return unwrap(await query.limit(500));
}

export async function getCustomer(db: SupabaseServerClient, id: string) {
  return unwrapMaybe(await db.from("customers").select("*").eq("id", id).maybeSingle());
}

export async function listCustomerOptions(db: SupabaseServerClient) {
  return unwrap(await db.from("customers").select("id, name, trade_name").eq("active", true).order("name").limit(2000));
}
