import "server-only";

import { calculateQuote } from "@/domain/costing/engine";
import type { CostingInput, CostingResult, CostingSuccess, QuoteItemInput } from "@/domain/costing/types";
import { SCALE, toFixedString, type Decimal } from "@/domain/shared/decimal";
import { todayISO } from "@/lib/format";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/server/db/database.types";
import { getSettings } from "@/server/repositories/reference";
import { RepositoryError, unwrap } from "@/server/repositories/util";

import { loadActiveRates, loadMaterialCosts, loadVersionSpecs } from "./costing-data";

/**
 * Monta a entrada do motor a partir do estado ATUAL do banco (preços vigentes,
 * taxas ativas e versões de ficha referenciadas pelos itens).
 */
export async function buildQuoteCostingInput(db: SupabaseServerClient, quoteId: string): Promise<CostingInput> {
  const [quoteRes, itemsRes, settings] = await Promise.all([
    db
      .from("quotes")
      .select("id, target_margin_percent, discount_percent, freight_amount, other_costs_amount")
      .eq("id", quoteId)
      .maybeSingle(),
    db.from("quote_items").select("*").eq("quote_id", quoteId).order("position"),
    getSettings(db),
  ]);
  const quote = unwrap(quoteRes);
  const items = unwrap(itemsRes);

  const specs = await loadVersionSpecs(db, items.map((i) => i.product_version_id));
  const materialIds = [...specs.values()].flatMap((s) => s.components.map((c) => c.materialId));
  const [materials, rates] = await Promise.all([
    loadMaterialCosts(db, materialIds, { today: todayISO(), staleAfterDays: settings.priceStaleAfterDays }),
    loadActiveRates(db),
  ]);

  const itemInputs: QuoteItemInput[] = items.map((i, idx) => {
    const version = specs.get(i.product_version_id);
    if (!version) throw new RepositoryError("Ficha técnica de um item não encontrada.");
    return {
      quoteItemId: i.id,
      // Posições sequenciais garantem unicidade na fotografia.
      position: idx + 1,
      description: i.description,
      widthMm: i.width_mm,
      heightMm: i.height_mm,
      quantity: String(i.quantity),
      includeInstallation: i.include_installation,
      extraCost: String(i.extra_cost),
      version,
    };
  });

  return {
    items: itemInputs,
    materials,
    ...rates,
    parameters: {
      targetMarginPercent: String(quote.target_margin_percent),
      discountPercent: String(quote.discount_percent),
      freightAmount: String(quote.freight_amount),
      otherCostsAmount: String(quote.other_costs_amount),
    },
  };
}

export async function previewQuoteCalculation(db: SupabaseServerClient, quoteId: string): Promise<CostingResult> {
  return calculateQuote(await buildQuoteCostingInput(db, quoteId));
}

const s = (d: Decimal | undefined | null, scale: number) => (d === undefined || d === null ? null : toFixedString(d, scale));

/** Converte o resultado do motor no formato das tabelas de fotografia. */
export function toSnapshotPayload(input: CostingInput, result: CostingSuccess) {
  const t = result.totals;
  const p = input.parameters;
  const snapshot = {
    engine_version: result.engineVersion,
    target_margin_percent: toFixedString(p.targetMarginPercent, SCALE.percent),
    discount_percent: toFixedString(p.discountPercent, SCALE.percent),
    sale_deductions_percent: toFixedString(t.saleDeductionsPercent, SCALE.percent),
    freight_amount: toFixedString(p.freightAmount, SCALE.money),
    other_costs_amount: toFixedString(p.otherCostsAmount, SCALE.money),
    material_cost: s(t.materialCost, 2),
    labor_cost: s(t.laborCost, 2),
    installation_cost: s(t.installationCost, 2),
    item_extra_cost: s(t.itemExtraCost, 2),
    freight_cost: s(t.freightCost, 2),
    other_cost: s(t.otherCost, 2),
    overhead_cost: s(t.overheadCost, 2),
    variable_cost: s(t.variableCost, 2),
    total_cost: s(t.totalCost, 2),
    purchase_need_cost: s(t.purchaseNeedCost, 2),
    list_price: s(t.listPrice, 2),
    discount_amount: s(t.discountAmount, 2),
    final_price: s(t.finalPrice, 2),
    sale_deductions_amount: s(t.saleDeductionsAmount, 2),
    contribution_margin: s(t.contributionMargin, 2),
    contribution_margin_percent: s(t.contributionMarginPercent, 4),
    net_profit: s(t.netProfit, 2),
    net_margin_percent: s(t.netMarginPercent, 4),
    warnings: result.warnings,
  };

  const items = result.items.map((i) => ({
    quote_item_id: i.quoteItemId,
    position: i.position,
    product_id: i.version.productId,
    product_version_id: i.version.id,
    product_code: i.version.productCode,
    product_name: i.version.productName,
    version_number: i.version.versionNumber,
    description: i.description,
    width_mm: i.widthMm,
    height_mm: i.heightMm,
    quantity: toFixedString(i.quantity, 3),
    area_m2: s(i.areaM2, 6),
    perimeter_m: s(i.perimeterM, 6),
    include_installation: i.includeInstallation,
    material_cost: s(i.materialCost, 4),
    labor_cost: s(i.laborCost, 4),
    installation_cost: s(i.installationCost, 4),
    extra_cost: s(i.extraCost, 4),
    allocated_freight: s(i.allocatedFreight, 4),
    allocated_other_cost: s(i.allocatedOtherCost, 4),
    overhead_cost: s(i.overheadCost, 4),
    total_cost: s(i.totalCost, 4),
    unit_cost: s(i.unitCost, 4),
    unit_list_price: s(i.unitListPrice, 2),
    total_list_price: s(i.totalListPrice, 2),
  }));

  const lines = result.lines.map((l) => ({
    item_position: l.itemPosition,
    line_type: l.lineType,
    description: l.description,
    material_id: l.materialId ?? null,
    supplier_id: l.supplierId ?? null,
    offer_id: l.offerId ?? null,
    labor_rate_id: l.laborRateId ?? null,
    overhead_rate_id: l.overheadRateId ?? null,
    sale_deduction_rate_id: l.saleDeductionRateId ?? null,
    product_component_id: l.productComponentId ?? null,
    material_code: l.materialCode ?? null,
    supplier_name: l.supplierName ?? null,
    quantity_basis: l.quantityBasis ?? null,
    unit_code: l.unitCode ?? null,
    quantity_net: s(l.quantityNet, SCALE.quantity),
    waste_percent: s(l.wastePercent, SCALE.percent),
    quantity_gross: s(l.quantityGross, SCALE.quantity),
    unit_cost: s(l.unitCost, SCALE.unitCost),
    rate: s(l.rate, 4),
    amount: toFixedString(l.amount, SCALE.amount),
    price_quoted_at: l.priceQuotedAt ?? null,
    price_valid_until: l.priceValidUntil ?? null,
  }));

  const needs = result.purchaseNeeds.map((n) => ({
    material_id: n.materialId,
    material_code: n.materialCode,
    material_description: n.materialDescription,
    consumption_unit_code: n.consumptionUnitCode,
    gross_consumption: s(n.grossConsumption, SCALE.quantity),
    offer_id: n.offerId,
    supplier_id: n.supplierId,
    supplier_name: n.supplierName,
    purchase_unit_code: n.purchaseUnitCode,
    units_per_purchase: s(n.unitsPerPurchase, SCALE.quantity),
    purchase_quantity: s(n.purchaseQuantity, SCALE.quantity),
    purchase_unit_cost: s(n.purchaseUnitCost, 4),
    purchase_cost: s(n.purchaseCost, 2),
    leftover_quantity: s(n.leftoverQuantity, SCALE.quantity),
  }));

  return { snapshot, items, lines, needs };
}

/** Calcula com os dados vigentes e grava a fotografia de forma atômica. */
export async function calculateAndSaveQuote(
  db: SupabaseServerClient,
  quoteId: string,
): Promise<{ ok: true; snapshotId: string; warnings: string[] } | { ok: false; errors: string[] }> {
  const input = await buildQuoteCostingInput(db, quoteId);
  const result = calculateQuote(input);
  if (!result.ok) return { ok: false, errors: result.errors };

  const payload = toSnapshotPayload(input, result);
  const { data, error } = await db.rpc("save_quote_calculation", {
    p_quote_id: quoteId,
    p_snapshot: payload.snapshot as unknown as Json,
    p_items: payload.items as unknown as Json,
    p_lines: payload.lines as unknown as Json,
    p_purchase_needs: payload.needs as unknown as Json,
  });
  const snapshotId = unwrap({ data, error });
  return { ok: true, snapshotId, warnings: result.warnings };
}
