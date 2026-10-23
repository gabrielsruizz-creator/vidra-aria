import { dec, HUNDRED, ONE, type Decimal, type DecimalInput } from "@/domain/shared/decimal";
import { diffDaysISO } from "@/lib/format";

/** Dados de uma oferta necessários para custeio (independentes do banco). */
export type OfferPricing = {
  id: string;
  supplierId: string;
  supplierName: string;
  materialId: string;
  purchaseUnitCode: string;
  /** Unidades de consumo do material contidas em 1 unidade de compra da oferta. */
  packageQuantity: DecimalInput;
  price: DecimalInput;
  discountPercent: DecimalInput;
  purchaseTaxPercent: DecimalInput;
  /** Frete por unidade de compra; null = desconhecido. */
  freightPerUnit: DecimalInput | null;
  quotedAt: string;
  validUntil: string | null;
  isPreferred: boolean;
  active: boolean;
};

/**
 * Custo efetivo de 1 unidade de compra:
 *   preço × (1 − desconto%) × (1 + tributos não recuperáveis%) + frete alocado
 */
export function effectivePurchaseUnitCost(offer: Pick<OfferPricing, "price" | "discountPercent" | "purchaseTaxPercent" | "freightPerUnit">): Decimal {
  const discounted = dec(offer.price).times(ONE.minus(dec(offer.discountPercent).div(HUNDRED)));
  const taxed = discounted.times(ONE.plus(dec(offer.purchaseTaxPercent).div(HUNDRED)));
  return taxed.plus(offer.freightPerUnit === null ? 0 : dec(offer.freightPerUnit));
}

/** Custo por unidade de consumo do material (ex.: R$/m, R$/m², R$/un). */
export function costPerConsumptionUnit(
  offer: Pick<OfferPricing, "price" | "discountPercent" | "purchaseTaxPercent" | "freightPerUnit" | "packageQuantity">,
): Decimal {
  const qty = dec(offer.packageQuantity);
  if (qty.lte(0)) throw new RangeError("Quantidade por embalagem deve ser maior que zero.");
  return effectivePurchaseUnitCost(offer).div(qty);
}

export type OfferFreshness = "vigente" | "desatualizada" | "vencida";

export const FRESHNESS_LABELS: Record<OfferFreshness, string> = {
  vigente: "Vigente",
  desatualizada: "Desatualizada",
  vencida: "Vencida",
};

/**
 * vencida: passou da validade informada pelo fornecedor;
 * desatualizada: cotação mais antiga que o limite configurado;
 * vigente: caso contrário.
 */
export function offerFreshness(
  offer: Pick<OfferPricing, "quotedAt" | "validUntil">,
  today: string,
  staleAfterDays: number,
): { status: OfferFreshness; ageDays: number } {
  const ageDays = diffDaysISO(offer.quotedAt, today);
  if (offer.validUntil && offer.validUntil < today) return { status: "vencida", ageDays };
  if (ageDays > staleAfterDays) return { status: "desatualizada", ageDays };
  return { status: "vigente", ageDays };
}

export type OfferSelection = {
  offer: OfferPricing;
  reason: "preferencial" | "menor_custo";
  unitCost: Decimal;
  freshness: OfferFreshness;
  warnings: string[];
};

/**
 * Escolhe a oferta usada no custeio de um material:
 *   1. preferencial ativa e não vencida;
 *   2. senão, a de menor custo por unidade de consumo entre as não vencidas
 *      (empate: cotação mais recente);
 *   3. se todas estiverem vencidas, aplica a mesma regra entre elas, com aviso.
 */
export function selectOffer(
  offers: OfferPricing[],
  options: { today: string; staleAfterDays: number; materialLabel?: string },
): OfferSelection | null {
  const label = options.materialLabel ?? "material";
  const active = offers.filter((o) => o.active);
  if (active.length === 0) return null;

  const notExpired = active.filter((o) => !o.validUntil || o.validUntil >= options.today);
  const pool = notExpired.length > 0 ? notExpired : active;

  const preferred = pool.find((o) => o.isPreferred);
  let chosen: OfferPricing;
  let reason: OfferSelection["reason"];
  if (preferred) {
    chosen = preferred;
    reason = "preferencial";
  } else {
    chosen = [...pool].sort((a, b) => {
      const diff = costPerConsumptionUnit(a).comparedTo(costPerConsumptionUnit(b));
      if (diff !== 0) return diff;
      return b.quotedAt.localeCompare(a.quotedAt);
    })[0];
    reason = "menor_custo";
  }

  const { status, ageDays } = offerFreshness(chosen, options.today, options.staleAfterDays);
  const warnings: string[] = [];
  if (status === "vencida") {
    warnings.push(`${label}: preço de ${chosen.supplierName} vencido em ${chosen.validUntil}.`);
  } else if (status === "desatualizada") {
    warnings.push(`${label}: preço de ${chosen.supplierName} cotado há ${ageDays} dias.`);
  }
  if (chosen.freightPerUnit === null) {
    warnings.push(`${label}: frete não informado na oferta de ${chosen.supplierName}.`);
  }

  return { offer: chosen, reason, unitCost: costPerConsumptionUnit(chosen), freshness: status, warnings };
}
