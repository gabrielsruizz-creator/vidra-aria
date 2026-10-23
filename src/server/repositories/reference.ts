import "server-only";

import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { UnitInfo } from "@/domain/units/units";

import { unwrap, unwrapMaybe } from "./util";

export async function listUnits(db: SupabaseServerClient): Promise<(UnitInfo & { name: string })[]> {
  const rows = unwrap(
    await db.from("units").select("code, name, symbol, dimension, factor_to_base").eq("active", true).order("dimension").order("factor_to_base"),
  );
  return rows.map((u) => ({
    code: u.code,
    name: u.name,
    symbol: u.symbol,
    dimension: u.dimension,
    factorToBase: String(u.factor_to_base),
  }));
}

export async function listMaterialCategories(db: SupabaseServerClient) {
  return unwrap(await db.from("material_categories").select("id, code, name").eq("active", true).order("sort_order"));
}

export async function listProductLines(db: SupabaseServerClient) {
  return unwrap(await db.from("product_lines").select("id, name").eq("active", true).order("name"));
}

export async function listProductCategories(db: SupabaseServerClient) {
  return unwrap(await db.from("product_categories").select("id, name").eq("active", true).order("sort_order"));
}

export async function getSettings(db: SupabaseServerClient) {
  const row = unwrapMaybe(await db.from("company_settings").select("*").maybeSingle());
  return {
    companyName: row?.company_name ?? null,
    defaultTargetMarginPercent:
      row?.default_target_margin_percent === null || row?.default_target_margin_percent === undefined
        ? null
        : String(row.default_target_margin_percent),
    priceStaleAfterDays: row?.price_stale_after_days ?? 90,
    quoteValidityDays: row?.quote_validity_days ?? 15,
    defaultPaymentTerms: row?.default_payment_terms ?? null,
    proposalFooter: row?.proposal_footer ?? null,
  };
}
export type AppSettings = Awaited<ReturnType<typeof getSettings>>;
