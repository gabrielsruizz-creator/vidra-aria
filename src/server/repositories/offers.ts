import "server-only";

import type { OfferPricing } from "@/domain/pricing/offers";
import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, num, unwrap, unwrapMaybe } from "./util";

const OFFER_COLUMNS = `
  id, supplier_id, material_id, supplier_item_code, purchase_unit_code, package_quantity, price,
  discount_percent, purchase_tax_percent, freight_per_unit, minimum_order_quantity, quoted_at,
  valid_until, is_preferred, active, notes, updated_at,
  supplier:suppliers(legal_name, trade_name),
  material:materials(internal_code, description, consumption_unit_code)
`;

type OfferRowRaw = {
  id: string;
  supplier_id: string;
  material_id: string;
  supplier_item_code: string | null;
  purchase_unit_code: string;
  package_quantity: number;
  price: number;
  discount_percent: number;
  purchase_tax_percent: number;
  freight_per_unit: number | null;
  minimum_order_quantity: number | null;
  quoted_at: string;
  valid_until: string | null;
  is_preferred: boolean;
  active: boolean;
  notes: string | null;
  updated_at: string;
  supplier: { legal_name: string; trade_name: string | null } | null;
  material: { internal_code: string; description: string; consumption_unit_code: string } | null;
};

export type OfferRow = OfferPricing & {
  supplierItemCode: string | null;
  minimumOrderQuantity: string | null;
  notes: string | null;
  updatedAt: string;
  materialCode: string;
  materialDescription: string;
  consumptionUnitCode: string;
};

export function supplierDisplayName(s: { legal_name: string; trade_name: string | null } | null): string {
  if (!s) return "—";
  return s.trade_name?.trim() ? s.trade_name : s.legal_name;
}

function toOffer(r: OfferRowRaw): OfferRow {
  return {
    id: r.id,
    supplierId: r.supplier_id,
    supplierName: supplierDisplayName(r.supplier),
    materialId: r.material_id,
    purchaseUnitCode: r.purchase_unit_code,
    packageQuantity: String(r.package_quantity),
    price: String(r.price),
    discountPercent: String(r.discount_percent),
    purchaseTaxPercent: String(r.purchase_tax_percent),
    freightPerUnit: num(r.freight_per_unit),
    quotedAt: r.quoted_at,
    validUntil: r.valid_until,
    isPreferred: r.is_preferred,
    active: r.active,
    supplierItemCode: r.supplier_item_code,
    minimumOrderQuantity: num(r.minimum_order_quantity),
    notes: r.notes,
    updatedAt: r.updated_at,
    materialCode: r.material?.internal_code ?? "—",
    materialDescription: r.material?.description ?? "—",
    consumptionUnitCode: r.material?.consumption_unit_code ?? "",
  };
}

export async function listOffers(
  db: SupabaseServerClient,
  filters: { materialIds?: string[]; supplierId?: string; activeOnly?: boolean; q?: string } = {},
): Promise<OfferRow[]> {
  let query = db.from("supplier_material_offers").select(OFFER_COLUMNS).order("quoted_at", { ascending: false });
  if (filters.materialIds) query = query.in("material_id", filters.materialIds);
  if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
  if (filters.activeOnly) query = query.eq("active", true);
  if (filters.q?.trim()) {
    // Busca por material (código/descrição) via subconsulta de ids.
    const pattern = ilikePattern(filters.q);
    const mats = unwrap(
      await db.from("materials").select("id").or(`internal_code.ilike.${pattern},description.ilike.${pattern}`).limit(500),
    );
    const sups = unwrap(
      await db.from("suppliers").select("id").or(`legal_name.ilike.${pattern},trade_name.ilike.${pattern}`).limit(500),
    );
    const matIds = mats.map((m) => m.id);
    const supIds = sups.map((s) => s.id);
    if (matIds.length === 0 && supIds.length === 0) return [];
    const ors = [
      matIds.length ? `material_id.in.(${matIds.join(",")})` : null,
      supIds.length ? `supplier_id.in.(${supIds.join(",")})` : null,
    ].filter(Boolean);
    query = query.or(ors.join(","));
  }
  const rows = unwrap(await query.limit(1000).overrideTypes<OfferRowRaw[], { merge: false }>());
  return rows.map(toOffer);
}

export async function getOffer(db: SupabaseServerClient, id: string): Promise<OfferRow | null> {
  const row = unwrapMaybe(
    await db
      .from("supplier_material_offers")
      .select(OFFER_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<OfferRowRaw | null, { merge: false }>(),
  );
  return row ? toOffer(row) : null;
}

export type PriceHistoryRow = {
  id: number;
  offerId: string;
  supplierName: string;
  materialCode: string;
  changeType: "criacao" | "atualizacao";
  purchaseUnitCode: string;
  packageQuantity: string;
  price: string;
  discountPercent: string;
  purchaseTaxPercent: string;
  freightPerUnit: string | null;
  quotedAt: string;
  validUntil: string | null;
  recordedAt: string;
};

export async function listPriceHistory(
  db: SupabaseServerClient,
  filter: { materialId?: string; offerId?: string },
  limit = 200,
): Promise<PriceHistoryRow[]> {
  let query = db
    .from("material_price_history")
    .select(
      "id, offer_id, change_type, purchase_unit_code, package_quantity, price, discount_percent, purchase_tax_percent, freight_per_unit, quoted_at, valid_until, recorded_at, supplier:suppliers(legal_name, trade_name), material:materials(internal_code)",
    )
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (filter.materialId) query = query.eq("material_id", filter.materialId);
  if (filter.offerId) query = query.eq("offer_id", filter.offerId);
  const rows = unwrap(await query);
  return rows.map((r) => ({
    id: r.id,
    offerId: r.offer_id,
    supplierName: supplierDisplayName(r.supplier),
    materialCode: r.material?.internal_code ?? "—",
    changeType: r.change_type as PriceHistoryRow["changeType"],
    purchaseUnitCode: r.purchase_unit_code,
    packageQuantity: String(r.package_quantity),
    price: String(r.price),
    discountPercent: String(r.discount_percent),
    purchaseTaxPercent: String(r.purchase_tax_percent),
    freightPerUnit: num(r.freight_per_unit),
    quotedAt: r.quoted_at,
    validUntil: r.valid_until,
    recordedAt: r.recorded_at,
  }));
}
