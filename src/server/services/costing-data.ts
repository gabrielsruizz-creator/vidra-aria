import "server-only";

import type {
  LaborRateInfo,
  MaterialCostInfo,
  OverheadRateInfo,
  ProductVersionSpec,
  SaleDeductionInfo,
} from "@/domain/costing/types";
import { effectivePurchaseUnitCost, selectOffer } from "@/domain/pricing/offers";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { listOffers } from "@/server/repositories/offers";
import { unwrap } from "@/server/repositories/util";

/** Carrega fichas técnicas (componentes e operações) das versões informadas. */
export async function loadVersionSpecs(db: SupabaseServerClient, versionIds: string[]): Promise<Map<string, ProductVersionSpec>> {
  const ids = [...new Set(versionIds)];
  const result = new Map<string, ProductVersionSpec>();
  if (ids.length === 0) return result;

  const [versions, components, operations] = await Promise.all([
    db
      .from("product_versions")
      .select("id, product_id, version_number, min_width_mm, max_width_mm, min_height_mm, max_height_mm, product:products(code, name, requires_dimensions)")
      .in("id", ids),
    db.from("product_components").select("*").in("product_version_id", ids),
    db.from("product_labor_operations").select("*").in("product_version_id", ids),
  ]);

  for (const v of unwrap(versions)) {
    result.set(v.id, {
      id: v.id,
      productId: v.product_id,
      productCode: v.product?.code ?? "",
      productName: v.product?.name ?? "",
      versionNumber: v.version_number,
      requiresDimensions: v.product?.requires_dimensions ?? true,
      minWidthMm: v.min_width_mm,
      maxWidthMm: v.max_width_mm,
      minHeightMm: v.min_height_mm,
      maxHeightMm: v.max_height_mm,
      components: [],
      laborOperations: [],
    });
  }
  for (const c of unwrap(components)) {
    result.get(c.product_version_id)?.components.push({
      id: c.id,
      position: c.position,
      materialId: c.material_id,
      description: c.description,
      quantityBasis: c.quantity_basis,
      coefficient: String(c.coefficient),
      offsetMm: String(c.offset_mm),
      wastePercent: String(c.waste_percent),
    });
  }
  for (const o of unwrap(operations)) {
    result.get(o.product_version_id)?.laborOperations.push({
      id: o.id,
      position: o.position,
      laborRateId: o.labor_rate_id,
      stage: o.stage,
      description: o.description,
      timeBasis: o.time_basis,
      minutes: String(o.minutes),
    });
  }
  return result;
}

/** Resolve unidade e oferta de custeio de cada material. */
export async function loadMaterialCosts(
  db: SupabaseServerClient,
  materialIds: string[],
  options: { today: string; staleAfterDays: number },
): Promise<Record<string, MaterialCostInfo>> {
  const ids = [...new Set(materialIds)];
  if (ids.length === 0) return {};
  const [materials, offers] = await Promise.all([
    db
      .from("materials")
      .select("id, internal_code, description, consumption_unit:units!materials_consumption_unit_code_fkey(code, symbol, dimension, factor_to_base)")
      .in("id", ids),
    listOffers(db, { materialIds: ids, activeOnly: true }),
  ]);

  const out: Record<string, MaterialCostInfo> = {};
  for (const m of unwrap(materials)) {
    const unit = m.consumption_unit;
    if (!unit) continue;
    const selection = selectOffer(
      offers.filter((o) => o.materialId === m.id),
      { ...options, materialLabel: m.internal_code },
    );
    out[m.id] = {
      materialId: m.id,
      code: m.internal_code,
      description: m.description,
      consumptionUnit: {
        code: unit.code,
        symbol: unit.symbol,
        dimension: unit.dimension,
        factorToBase: String(unit.factor_to_base),
      },
      offer: selection
        ? {
            id: selection.offer.id,
            supplierId: selection.offer.supplierId,
            supplierName: selection.offer.supplierName,
            purchaseUnitCode: selection.offer.purchaseUnitCode,
            packageQuantity: selection.offer.packageQuantity,
            purchaseUnitCost: effectivePurchaseUnitCost(selection.offer),
            unitCost: selection.unitCost,
            quotedAt: selection.offer.quotedAt,
            validUntil: selection.offer.validUntil,
            freshness: selection.freshness,
          }
        : null,
      warnings: selection?.warnings ?? [],
    };
  }
  return out;
}

/** Taxas ATIVAS vigentes (mão de obra, rateios e deduções sobre a venda). */
export async function loadActiveRates(db: SupabaseServerClient): Promise<{
  laborRates: Record<string, LaborRateInfo>;
  overheadRates: OverheadRateInfo[];
  saleDeductions: SaleDeductionInfo[];
}> {
  const [labor, overhead, deductions] = await Promise.all([
    db.from("labor_rates").select("id, name, hourly_cost").eq("active", true),
    db.from("overhead_rates").select("id, name, method, rate").eq("active", true).order("name"),
    db.from("sale_deduction_rates").select("id, name, kind, percent").eq("active", true).order("name"),
  ]);
  return {
    laborRates: Object.fromEntries(
      unwrap(labor).map((r) => [r.id, { id: r.id, name: r.name, hourlyCost: String(r.hourly_cost) }]),
    ),
    overheadRates: unwrap(overhead).map((r) => ({ id: r.id, name: r.name, method: r.method, rate: String(r.rate) })),
    saleDeductions: unwrap(deductions).map((r) => ({ id: r.id, name: r.name, kind: r.kind, percent: String(r.percent) })),
  };
}
