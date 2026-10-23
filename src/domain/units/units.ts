import { dec, type Decimal, type DecimalInput } from "@/domain/shared/decimal";

export type UnitDimension = "comprimento" | "area" | "volume" | "massa" | "unidade";

export type UnitInfo = {
  code: string;
  symbol: string;
  dimension: UnitDimension;
  /** Fator para a unidade-base da dimensão (m, m², L, kg). */
  factorToBase: DecimalInput;
};

export const DIMENSION_LABELS: Record<UnitDimension, string> = {
  comprimento: "Comprimento",
  area: "Área",
  volume: "Volume",
  massa: "Massa",
  unidade: "Unidade/embalagem",
};

export class UnitConversionError extends Error {}

/**
 * Converte quantidade entre unidades da mesma dimensão física.
 * Unidades de contagem/embalagem ('unidade') só convertem para o mesmo código:
 * a relação caixa × peça depende do material e fica na oferta/material.
 */
export function convertQuantity(quantity: DecimalInput, from: UnitInfo, to: UnitInfo): Decimal {
  if (from.code === to.code) return dec(quantity);
  if (from.dimension !== to.dimension || from.dimension === "unidade") {
    throw new UnitConversionError(`Não há conversão direta de ${from.symbol} para ${to.symbol}.`);
  }
  return dec(quantity).times(dec(from.factorToBase)).div(dec(to.factorToBase));
}

/** Converte um valor expresso na unidade-base da dimensão (m, m²...) para a unidade informada. */
export function fromBase(quantityInBase: DecimalInput, to: UnitInfo): Decimal {
  return dec(quantityInBase).div(dec(to.factorToBase));
}
