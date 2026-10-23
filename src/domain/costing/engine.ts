import { dec, HUNDRED, roundMoney, sum, ZERO, type Decimal } from "@/domain/shared/decimal";

import { allocate, marginsFor, markupDivisor, PricingError } from "./pricing";
import {
  basisValue,
  componentQuantityPerUnit,
  geometryFromMillimeters,
  QuantityError,
  withWaste,
  type ItemGeometry,
} from "./quantities";
import type {
  CostingInput,
  CostingResult,
  CostLine,
  ItemResult,
  PurchaseNeed,
  QuoteItemInput,
} from "./types";

/**
 * Versão das regras de cálculo. Gravada em cada fotografia de custo;
 * altere ao mudar qualquer regra deste módulo.
 */
export const ENGINE_VERSION = "1.0.0";

const MINUTES_PER_HOUR = 60;

type PartialItem = Omit<
  ItemResult,
  "allocatedFreight" | "allocatedOtherCost" | "overheadCost" | "variableCost" | "totalCost" | "unitCost" | "unitListPrice" | "totalListPrice"
> & { directForOverhead: Decimal };

/**
 * Calcula custos e preço de um orçamento.
 *
 * Etapas (detalhadas em docs/MOTOR-DE-CUSTOS.md):
 *  1. Consumo de materiais por item: base de dimensionamento × coeficiente,
 *     convertido para a unidade de consumo, × quantidade, + perda.
 *  2. Mão de obra direta de fabricação e, se marcada, de instalação.
 *  3. Custos específicos do item; frete e outros custos do orçamento
 *     rateados pelo custo direto dos itens.
 *  4. Custos indiretos (rateio) por % do custo direto ou por hora de MO.
 *  5. Preço recomendado = custo total / (1 − deduções% − margem%).
 *  6. Desconto, deduções sobre a venda, margem de contribuição e lucro líquido.
 *  7. Necessidade de compra por material (arredondada à unidade de compra).
 */
export function calculateQuote(input: CostingInput): CostingResult {
  const errors: string[] = [];
  const warnings = new Set<string>();
  const lines: CostLine[] = [];
  const consumption = new Map<string, Decimal>();

  if (input.items.length === 0) {
    return { ok: false, engineVersion: ENGINE_VERSION, errors: ["Adicione ao menos um item ao orçamento."], warnings: [] };
  }

  const p = input.parameters;
  const saleDeductionsPercent = sum(input.saleDeductions.map((d) => d.percent));
  let divisor: Decimal | null = null;
  try {
    divisor = markupDivisor(saleDeductionsPercent, p.targetMarginPercent);
  } catch (e) {
    if (e instanceof PricingError) errors.push(e.message);
    else throw e;
  }

  const partials: PartialItem[] = [];
  for (const item of input.items) {
    const partial = costItem(item, input, lines, consumption, errors, warnings);
    if (partial) partials.push(partial);
  }

  if (errors.length > 0 || !divisor) {
    return { ok: false, engineVersion: ENGINE_VERSION, errors: dedupe(errors), warnings: [...warnings] };
  }

  // Rateio de frete e outros custos do orçamento pelo custo direto dos itens.
  const directWeights = partials.map((it) => it.materialCost.plus(it.laborCost).plus(it.installationCost).plus(it.extraCost));
  const freightShares = allocate(p.freightAmount, directWeights);
  const otherShares = allocate(p.otherCostsAmount, directWeights);

  const items: ItemResult[] = partials.map((it, idx) => {
    const allocatedFreight = freightShares[idx];
    const allocatedOtherCost = otherShares[idx];
    if (!allocatedFreight.isZero()) {
      lines.push({ itemPosition: it.position, lineType: "frete", description: "Frete do orçamento (rateio)", amount: allocatedFreight });
    }
    if (!allocatedOtherCost.isZero()) {
      lines.push({ itemPosition: it.position, lineType: "outro_custo", description: "Outros custos do orçamento (rateio)", amount: allocatedOtherCost });
    }

    let overheadCost = ZERO;
    for (const rate of input.overheadRates) {
      const r = dec(rate.rate);
      const amount =
        rate.method === "percentual_custo_direto" ? it.directForOverhead.times(r).div(HUNDRED) : it.laborHours.times(r);
      if (amount.isZero()) continue;
      overheadCost = overheadCost.plus(amount);
      lines.push({
        itemPosition: it.position,
        lineType: "custo_indireto",
        description:
          rate.method === "percentual_custo_direto"
            ? `${rate.name} (% sobre materiais e mão de obra)`
            : `${rate.name} (por hora de mão de obra)`,
        overheadRateId: rate.id,
        rate: r,
        quantityNet: rate.method === "valor_por_hora_mo" ? it.laborHours : it.directForOverhead,
        amount,
      });
    }

    const variableCost = it.materialCost
      .plus(it.laborCost)
      .plus(it.installationCost)
      .plus(it.extraCost)
      .plus(allocatedFreight)
      .plus(allocatedOtherCost);
    const totalCost = variableCost.plus(overheadCost);
    const unitCost = totalCost.div(it.quantity);
    const unitListPrice = roundMoney(unitCost.div(divisor));
    const totalListPrice = roundMoney(unitListPrice.times(it.quantity));

    const { directForOverhead: _ignored, ...rest } = it;
    void _ignored;
    return { ...rest, allocatedFreight, allocatedOtherCost, overheadCost, variableCost, totalCost, unitCost, unitListPrice, totalListPrice };
  });

  // Totais
  const t = <K extends keyof ItemResult>(k: K) => sum(items.map((i) => i[k] as Decimal));
  const variableCost = t("variableCost");
  const overheadCost = t("overheadCost");
  const totalCost = t("totalCost");
  const listPrice = t("totalListPrice");
  const discountAmount = roundMoney(listPrice.times(dec(p.discountPercent)).div(HUNDRED));
  const finalPrice = listPrice.minus(discountAmount);
  const margins = marginsFor({ finalPrice, variableCost, overheadCost, saleDeductionsPercent });

  for (const d of input.saleDeductions) {
    const percent = dec(d.percent);
    if (percent.isZero()) continue;
    lines.push({
      itemPosition: null,
      lineType: "deducao_venda",
      description: d.name,
      saleDeductionRateId: d.id,
      rate: percent,
      amount: finalPrice.times(percent).div(HUNDRED),
    });
  }

  const purchaseNeeds = buildPurchaseNeeds(input, consumption);

  if (margins.netProfit.isNegative()) {
    warnings.add("O preço final não cobre o custo total: lucro líquido negativo.");
  } else if (!discountAmount.isZero() && margins.netMarginPercent.lt(dec(p.targetMarginPercent))) {
    warnings.add("O desconto concedido reduz a margem líquida abaixo da margem desejada.");
  }
  if (input.saleDeductions.length === 0) {
    warnings.add("Nenhum tributo ou comissão sobre a venda cadastrado: confira em Configurações.");
  }
  if (input.overheadRates.length === 0) {
    warnings.add("Nenhum custo indireto cadastrado: o lucro líquido pode estar superestimado.");
  }

  const totals = {
    materialCost: roundMoney(t("materialCost")),
    laborCost: roundMoney(t("laborCost")),
    installationCost: roundMoney(t("installationCost")),
    itemExtraCost: roundMoney(t("extraCost")),
    freightCost: roundMoney(t("allocatedFreight")),
    otherCost: roundMoney(t("allocatedOtherCost")),
    overheadCost: roundMoney(overheadCost),
    variableCost: roundMoney(variableCost),
    totalCost: roundMoney(totalCost),
    purchaseNeedCost: roundMoney(sum(purchaseNeeds.map((n) => n.purchaseCost))),
    saleDeductionsPercent,
    listPrice,
    discountAmount,
    finalPrice,
    saleDeductionsAmount: margins.saleDeductionsAmount,
    contributionMargin: roundMoney(margins.contributionMargin),
    contributionMarginPercent: margins.contributionMarginPercent.toDecimalPlaces(4),
    netProfit: roundMoney(margins.netProfit),
    netMarginPercent: margins.netMarginPercent.toDecimalPlaces(4),
    breakEvenPrice: roundMoney(totalCost.div(markupDivisor(saleDeductionsPercent, 0))),
  };

  return { ok: true, engineVersion: ENGINE_VERSION, items, lines, purchaseNeeds, totals, warnings: [...warnings] };
}

function costItem(
  item: QuoteItemInput,
  input: CostingInput,
  lines: CostLine[],
  consumption: Map<string, Decimal>,
  errors: string[],
  warnings: Set<string>,
): PartialItem | null {
  const v = item.version;
  const label = `Item ${item.position} (${v.productCode})`;
  const quantity = dec(item.quantity);
  if (quantity.lte(0)) {
    errors.push(`${label}: a quantidade deve ser maior que zero.`);
    return null;
  }

  let geometry: ItemGeometry | null = null;
  if (v.requiresDimensions) {
    if (!item.widthMm || !item.heightMm || item.widthMm <= 0 || item.heightMm <= 0) {
      errors.push(`${label}: informe largura e altura.`);
      return null;
    }
    const outside: string[] = [];
    if (v.minWidthMm && item.widthMm < v.minWidthMm) outside.push(`largura mínima ${v.minWidthMm} mm`);
    if (v.maxWidthMm && item.widthMm > v.maxWidthMm) outside.push(`largura máxima ${v.maxWidthMm} mm`);
    if (v.minHeightMm && item.heightMm < v.minHeightMm) outside.push(`altura mínima ${v.minHeightMm} mm`);
    if (v.maxHeightMm && item.heightMm > v.maxHeightMm) outside.push(`altura máxima ${v.maxHeightMm} mm`);
    if (outside.length) {
      errors.push(`${label}: medidas fora dos limites da ficha (${outside.join(", ")}).`);
      return null;
    }
    geometry = geometryFromMillimeters(item.widthMm, item.heightMm);
  }

  if (v.components.length === 0 && v.laborOperations.length === 0) {
    errors.push(`${label}: a ficha técnica não possui componentes nem operações.`);
    return null;
  }

  let materialCost = ZERO;
  let failed = false;
  for (const c of [...v.components].sort((a, b) => a.position - b.position)) {
    const material = input.materials[c.materialId];
    if (!material) {
      errors.push(`${label}: material do componente não encontrado.`);
      failed = true;
      continue;
    }
    if (!material.offer) {
      errors.push(`${label}: o material ${material.code} não possui oferta ativa de fornecedor.`);
      failed = true;
      continue;
    }
    for (const w of material.warnings) warnings.add(w);

    let perUnit: Decimal;
    try {
      perUnit = componentQuantityPerUnit(c, geometry, material.consumptionUnit);
    } catch (e) {
      if (!(e instanceof QuantityError)) throw e;
      errors.push(`${label}, ${material.code}: ${e.message}`);
      failed = true;
      continue;
    }
    const net = perUnit.times(quantity);
    const waste = dec(c.wastePercent);
    const gross = withWaste(net, waste);
    const unitCost = dec(material.offer.unitCost);
    const amount = gross.times(unitCost);
    materialCost = materialCost.plus(amount);
    consumption.set(material.materialId, (consumption.get(material.materialId) ?? ZERO).plus(gross));
    lines.push({
      itemPosition: item.position,
      lineType: "material",
      description: c.description ? `${material.description} — ${c.description}` : material.description,
      materialId: material.materialId,
      materialCode: material.code,
      supplierId: material.offer.supplierId,
      supplierName: material.offer.supplierName,
      offerId: material.offer.id,
      productComponentId: c.id,
      quantityBasis: c.quantityBasis,
      unitCode: material.consumptionUnit.code,
      quantityNet: net,
      wastePercent: waste,
      quantityGross: gross,
      unitCost,
      amount,
      priceQuotedAt: material.offer.quotedAt,
      priceValidUntil: material.offer.validUntil,
    });
  }

  let laborCost = ZERO;
  let installationCost = ZERO;
  let laborHours = ZERO;
  for (const op of [...v.laborOperations].sort((a, b) => a.position - b.position)) {
    if (op.stage === "instalacao" && !item.includeInstallation) continue;
    const rate = input.laborRates[op.laborRateId];
    if (!rate) {
      errors.push(`${label}: taxa de mão de obra da operação "${op.description}" não encontrada ou inativa.`);
      failed = true;
      continue;
    }
    let base: Decimal;
    try {
      base = basisValue(op.timeBasis, geometry);
    } catch (e) {
      if (!(e instanceof QuantityError)) throw e;
      errors.push(`${label}, operação "${op.description}": ${e.message}`);
      failed = true;
      continue;
    }
    const minutes = dec(op.minutes).times(base).times(quantity);
    const hours = minutes.div(MINUTES_PER_HOUR);
    const hourly = dec(rate.hourlyCost);
    const amount = hours.times(hourly);
    laborHours = laborHours.plus(hours);
    if (op.stage === "instalacao") installationCost = installationCost.plus(amount);
    else laborCost = laborCost.plus(amount);
    lines.push({
      itemPosition: item.position,
      lineType: op.stage === "instalacao" ? "instalacao" : "mao_de_obra",
      description: `${op.description} (${rate.name})`,
      laborRateId: rate.id,
      quantityBasis: op.timeBasis,
      unitCode: "h",
      quantityNet: hours,
      quantityGross: hours,
      unitCost: hourly,
      rate: hourly,
      amount,
    });
  }

  if (item.includeInstallation && !v.laborOperations.some((o) => o.stage === "instalacao")) {
    warnings.add(`${label}: instalação marcada, mas a ficha não tem operações de instalação (custo zero).`);
  }

  const extraCost = dec(item.extraCost);
  if (!extraCost.isZero()) {
    lines.push({ itemPosition: item.position, lineType: "outro_custo", description: "Custo específico do item", amount: extraCost });
  }

  if (failed) return null;

  return {
    quoteItemId: item.quoteItemId,
    position: item.position,
    version: v,
    description: item.description,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    quantity,
    areaM2: geometry ? geometry.area : null,
    perimeterM: geometry ? geometry.perimeter : null,
    includeInstallation: item.includeInstallation,
    materialCost,
    laborCost,
    laborHours,
    installationCost,
    extraCost,
    directForOverhead: materialCost.plus(laborCost).plus(installationCost),
  };
}

/**
 * Necessidade de compra: consumo bruto total de cada material dividido pelo
 * conteúdo da unidade de compra, arredondado para cima. Não considera plano
 * de corte nem aproveitamento de sobras.
 */
function buildPurchaseNeeds(input: CostingInput, consumption: Map<string, Decimal>): PurchaseNeed[] {
  const needs: PurchaseNeed[] = [];
  for (const [materialId, gross] of consumption) {
    const m = input.materials[materialId];
    if (!m?.offer) continue;
    const unitsPerPurchase = dec(m.offer.packageQuantity);
    const purchaseQuantity = gross.div(unitsPerPurchase).ceil();
    const purchaseUnitCost = dec(m.offer.purchaseUnitCost);
    needs.push({
      materialId,
      materialCode: m.code,
      materialDescription: m.description,
      consumptionUnitCode: m.consumptionUnit.code,
      grossConsumption: gross,
      offerId: m.offer.id,
      supplierId: m.offer.supplierId,
      supplierName: m.offer.supplierName,
      purchaseUnitCode: m.offer.purchaseUnitCode,
      unitsPerPurchase,
      purchaseQuantity,
      purchaseUnitCost,
      purchaseCost: roundMoney(purchaseQuantity.times(purchaseUnitCost)),
      leftoverQuantity: purchaseQuantity.times(unitsPerPurchase).minus(gross),
    });
  }
  return needs.sort((a, b) => a.materialCode.localeCompare(b.materialCode));
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}
