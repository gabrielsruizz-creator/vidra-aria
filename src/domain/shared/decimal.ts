import DecimalJs from "decimal.js";

/**
 * Instância isolada do decimal.js para todos os cálculos financeiros e de
 * quantidades. Nunca use `number` para dinheiro: 0,1 + 0,2 !== 0,3.
 *
 * Arredondamento comercial (meio para cima), precisão ampla para que só os
 * pontos explícitos de arredondamento (ver `roundMoney`) alterem valores.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
});
export type Decimal = InstanceType<typeof Decimal>;

export type DecimalInput = Decimal | string | number;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
export const HUNDRED = new Decimal(100);

/** Casas decimais usadas na persistência (ver migrações SQL). */
export const SCALE = {
  money: 2,
  amount: 4,
  unitCost: 6,
  quantity: 6,
  percent: 4,
} as const;

export function dec(value: DecimalInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError(`Valor numérico inválido: ${value}`);
  }
  const d = new Decimal(value);
  if (!d.isFinite()) throw new RangeError(`Valor numérico inválido: ${String(value)}`);
  return d;
}

export function sum(values: Iterable<DecimalInput>): Decimal {
  let total = ZERO;
  for (const v of values) total = total.plus(dec(v));
  return total;
}

/** Arredonda para centavos (meio para cima). */
export function roundMoney(value: DecimalInput): Decimal {
  return dec(value).toDecimalPlaces(SCALE.money, Decimal.ROUND_HALF_UP);
}

/** 12,5 (%) -> 0,125 */
export function pct(value: DecimalInput): Decimal {
  return dec(value).div(HUNDRED);
}

/** Serializa com escala fixa, no formato aceito por colunas `numeric`. */
export function toFixedString(value: DecimalInput, scale: number): string {
  return dec(value).toFixed(scale, Decimal.ROUND_HALF_UP);
}

/** Divisão segura: retorna `fallback` quando o divisor é zero. */
export function safeDiv(a: DecimalInput, b: DecimalInput, fallback: DecimalInput = 0): Decimal {
  const divisor = dec(b);
  if (divisor.isZero()) return dec(fallback);
  return dec(a).div(divisor);
}
