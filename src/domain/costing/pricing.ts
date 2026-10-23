import { dec, HUNDRED, ONE, roundMoney, safeDiv, ZERO, type Decimal, type DecimalInput } from "@/domain/shared/decimal";

export class PricingError extends Error {}

/**
 * Divisor do mark-up: 1 − (deduções sobre a venda + margem de lucro líquido).
 *   preço = custo total / divisor
 * Ex.: deduções 15% e margem 20% → preço = custo / 0,65.
 */
export function markupDivisor(saleDeductionsPercent: DecimalInput, targetMarginPercent: DecimalInput): Decimal {
  const divisor = ONE.minus(dec(saleDeductionsPercent).plus(dec(targetMarginPercent)).div(HUNDRED));
  if (divisor.lte(0)) {
    throw new PricingError("A soma de tributos/comissões e da margem desejada precisa ser menor que 100%.");
  }
  return divisor;
}

/** Preço de venda recomendado para cobrir o custo total, as deduções e a margem. */
export function recommendedPrice(totalCost: DecimalInput, saleDeductionsPercent: DecimalInput, targetMarginPercent: DecimalInput): Decimal {
  return dec(totalCost).div(markupDivisor(saleDeductionsPercent, targetMarginPercent));
}

/** Margens a partir de um preço final. Percentuais sobre o preço final. */
export function marginsFor(params: {
  finalPrice: DecimalInput;
  variableCost: DecimalInput;
  overheadCost: DecimalInput;
  saleDeductionsPercent: DecimalInput;
}) {
  const finalPrice = dec(params.finalPrice);
  const saleDeductionsAmount = roundMoney(finalPrice.times(dec(params.saleDeductionsPercent)).div(HUNDRED));
  const contributionMargin = finalPrice.minus(dec(params.variableCost)).minus(saleDeductionsAmount);
  const netProfit = contributionMargin.minus(dec(params.overheadCost));
  const pctOf = (v: Decimal) => (finalPrice.isZero() ? ZERO : v.div(finalPrice).times(HUNDRED));
  return {
    saleDeductionsAmount,
    contributionMargin,
    contributionMarginPercent: pctOf(contributionMargin),
    netProfit,
    netMarginPercent: pctOf(netProfit),
  };
}

/** Rateia `amount` proporcionalmente aos pesos (sem arredondar). */
export function allocate(amount: DecimalInput, weights: Decimal[]): Decimal[] {
  const total = weights.reduce((acc, w) => acc.plus(w), ZERO);
  const value = dec(amount);
  if (weights.length === 0) return [];
  if (total.isZero()) return weights.map(() => safeDiv(value, weights.length));
  return weights.map((w) => value.times(w).div(total));
}
