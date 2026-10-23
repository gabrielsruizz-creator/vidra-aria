import { dec, ONE, HUNDRED, type Decimal } from "@/domain/shared/decimal";
import { fromBase, type UnitInfo } from "@/domain/units/units";

import type { ComponentSpec, QuantityBasis } from "./types";

const MM_PER_M = 1000;

export type ItemGeometry = {
  /** metros */
  width: Decimal;
  /** metros */
  height: Decimal;
  area: Decimal;
  perimeter: Decimal;
};

export function geometryFromMillimeters(widthMm: number, heightMm: number): ItemGeometry {
  const width = dec(widthMm).div(MM_PER_M);
  const height = dec(heightMm).div(MM_PER_M);
  return { width, height, area: width.times(height), perimeter: width.plus(height).times(2) };
}

export class QuantityError extends Error {}

/**
 * Valor da base de dimensionamento para UMA unidade de produto.
 *   fixa -> 1; largura/altura/perímetro -> metros (+ ajuste); área -> m².
 * Regras genéricas e configuráveis: não representam fórmulas de corte.
 */
export function basisValue(basis: QuantityBasis, geometry: ItemGeometry | null, offsetMm: Decimal = dec(0)): Decimal {
  if (basis === "fixa") return ONE;
  if (!geometry) throw new QuantityError("Base dimensional exige largura e altura do item.");
  const offset = offsetMm.div(MM_PER_M);
  switch (basis) {
    case "largura":
      return geometry.width.plus(offset);
    case "altura":
      return geometry.height.plus(offset);
    case "perimetro":
      return geometry.perimeter.plus(offset);
    case "area":
      return geometry.area;
  }
}

/** Dimensão física exigida da unidade de consumo para cada base. */
export function requiredDimension(basis: QuantityBasis): "comprimento" | "area" | null {
  if (basis === "largura" || basis === "altura" || basis === "perimetro") return "comprimento";
  if (basis === "area") return "area";
  return null;
}

/**
 * Quantidade líquida de um componente por unidade de produto, já na unidade
 * de consumo do material.
 */
export function componentQuantityPerUnit(
  component: Pick<ComponentSpec, "quantityBasis" | "coefficient" | "offsetMm">,
  geometry: ItemGeometry | null,
  consumptionUnit: UnitInfo,
): Decimal {
  const coefficient = dec(component.coefficient);
  if (component.quantityBasis === "fixa") return coefficient;

  const needed = requiredDimension(component.quantityBasis);
  if (needed && consumptionUnit.dimension !== needed) {
    throw new QuantityError(
      `Base "${component.quantityBasis}" exige unidade de ${needed}, mas o material é consumido em ${consumptionUnit.symbol}.`,
    );
  }
  const base = basisValue(component.quantityBasis, geometry, dec(component.offsetMm));
  if (base.lte(0)) {
    throw new QuantityError("A medida resultante (medida + ajuste) não é positiva. Revise as medidas ou o ajuste da ficha.");
  }
  return fromBase(coefficient.times(base), consumptionUnit);
}

/** Aplica a perda percentual: bruto = líquido × (1 + perda%). */
export function withWaste(net: Decimal, wastePercent: Decimal): Decimal {
  return net.times(ONE.plus(wastePercent.div(HUNDRED)));
}
