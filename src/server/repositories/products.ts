import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, unwrap, unwrapMaybe } from "./util";

export async function listProducts(
  db: SupabaseServerClient,
  filters: { q?: string; categoryId?: string; status?: "ativos" | "inativos" | "todos" } = {},
) {
  let query = db
    .from("products")
    .select(
      "id, code, name, requires_dimensions, is_custom_size, active, category:product_categories(name), product_line:product_lines(name), versions:product_versions(id, version_number, status, published_at)",
    )
    .order("code");
  if (filters.q?.trim()) {
    const p = ilikePattern(filters.q);
    query = query.or(`code.ilike.${p},name.ilike.${p}`);
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  const status = filters.status ?? "ativos";
  if (status !== "todos") query = query.eq("active", status === "ativos");
  return unwrap(await query.limit(500));
}

export async function getProduct(db: SupabaseServerClient, id: string) {
  return unwrapMaybe(
    await db
      .from("products")
      .select("*, category:product_categories(name), product_line:product_lines(name)")
      .eq("id", id)
      .maybeSingle(),
  );
}

export async function listProductVersions(db: SupabaseServerClient, productId: string) {
  return unwrap(
    await db
      .from("product_versions")
      .select("id, version_number, status, change_summary, published_at, created_at, components:product_components(count), operations:product_labor_operations(count)")
      .eq("product_id", productId)
      .order("version_number", { ascending: false }),
  );
}

export async function getProductVersion(db: SupabaseServerClient, versionId: string) {
  return unwrapMaybe(
    await db
      .from("product_versions")
      .select("*, product:products(id, code, name, requires_dimensions)")
      .eq("id", versionId)
      .maybeSingle(),
  );
}

export async function listVersionComponents(db: SupabaseServerClient, versionId: string) {
  return unwrap(
    await db
      .from("product_components")
      .select("*, material:materials(internal_code, description, consumption_unit_code)")
      .eq("product_version_id", versionId)
      .order("position")
      .order("created_at"),
  );
}

export async function listVersionOperations(db: SupabaseServerClient, versionId: string) {
  return unwrap(
    await db
      .from("product_labor_operations")
      .select("*, labor_rate:labor_rates(name, hourly_cost, active)")
      .eq("product_version_id", versionId)
      .order("position")
      .order("created_at"),
  );
}

/** Produtos ativos com versão publicada (para itens de orçamento). */
export async function listQuotableProducts(db: SupabaseServerClient) {
  const rows = unwrap(
    await db
      .from("products")
      .select("id, code, name, requires_dimensions, versions:product_versions!inner(id, version_number, status)")
      .eq("active", true)
      .eq("versions.status", "publicada")
      .order("code"),
  );
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    requiresDimensions: p.requires_dimensions,
    publishedVersionId: p.versions[0]?.id as string,
    publishedVersionNumber: p.versions[0]?.version_number as number,
  }));
}
