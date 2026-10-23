import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, unwrap, unwrapMaybe } from "./util";

export type MaterialListFilters = { q?: string; categoryId?: string; status?: "ativos" | "inativos" | "todos" };

export async function listMaterials(db: SupabaseServerClient, filters: MaterialListFilters = {}) {
  let query = db
    .from("materials")
    .select(
      "id, internal_code, description, purchase_unit_code, consumption_unit_code, conversion_factor, commercial_length_mm, active, category:material_categories(name), product_line:product_lines(name)",
    )
    .order("internal_code");
  if (filters.q?.trim()) {
    const p = ilikePattern(filters.q);
    query = query.or(`internal_code.ilike.${p},description.ilike.${p}`);
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  const status = filters.status ?? "ativos";
  if (status !== "todos") query = query.eq("active", status === "ativos");
  return unwrap(await query.limit(500));
}

export async function getMaterial(db: SupabaseServerClient, id: string) {
  return unwrapMaybe(
    await db
      .from("materials")
      .select("*, category:material_categories(name), product_line:product_lines(name)")
      .eq("id", id)
      .maybeSingle(),
  );
}

/** Opções para selects (somente ativos). */
export async function listMaterialOptions(db: SupabaseServerClient) {
  return unwrap(
    await db
      .from("materials")
      .select("id, internal_code, description, consumption_unit_code, purchase_unit_code, conversion_factor")
      .eq("active", true)
      .order("internal_code")
      .limit(2000),
  );
}
