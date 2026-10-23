import { dec, Decimal, type DecimalInput } from "@/domain/shared/decimal";

export const TIME_ZONE = "America/Sao_Paulo";

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata um número no padrão brasileiro sem passar por `number`
 * (evita perda de precisão em valores grandes).
 */
export function formatNumber(
  value: DecimalInput | null | undefined,
  options: { decimals?: number; minDecimals?: number } = {},
): string {
  if (value === null || value === undefined || value === "") return "—";
  const decimals = options.decimals ?? 2;
  const minDecimals = options.minDecimals ?? decimals;
  let fixed = dec(value).toFixed(decimals, Decimal.ROUND_HALF_UP);
  if (minDecimals < decimals && fixed.includes(".")) {
    // remove zeros à direita além do mínimo exigido
    const [i, f] = fixed.split(".");
    let frac = f.replace(/0+$/, "");
    if (frac.length < minDecimals) frac = frac.padEnd(minDecimals, "0");
    fixed = frac ? `${i}.${frac}` : i;
  }
  const negative = fixed.startsWith("-");
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [intPart, fracPart] = unsigned.split(".");
  const isZero = /^[0.]+$/.test(unsigned);
  const body = groupThousands(intPart) + (fracPart ? `,${fracPart}` : "");
  return negative && !isZero ? `-${body}` : body;
}

/** R$ 1.234,56 */
export function formatCurrency(value: DecimalInput | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "—";
  const formatted = formatNumber(value, { decimals });
  return formatted.startsWith("-") ? `-R$ ${formatted.slice(1)}` : `R$ ${formatted}`;
}

/** 12,50% */
export function formatPercent(value: DecimalInput | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${formatNumber(value, { decimals })}%`;
}

/** Quantidade com até `decimals` casas, sem zeros desnecessários. */
export function formatQuantity(value: DecimalInput | null | undefined, decimals = 3): string {
  return formatNumber(value, { decimals, minDecimals: 0 });
}

/** "2026-03-05" (coluna `date`) -> "05/03/2026", sem conversão de fuso. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Timestamp ISO -> "05/03/2026 14:30" no horário de Brasília. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA já produz AAAA-MM-DD
}

/** Soma dias a uma data AAAA-MM-DD (calendário, sem fuso). */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas AAAA-MM-DD (b - a). */
export function diffDaysISO(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** Formata CNPJ (14 dígitos) como 00.000.000/0000-00. */
export function formatCnpj(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata CPF (11 dígitos) ou CNPJ conforme o tamanho. */
export function formatDocument(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return formatCnpj(d);
}

/** Medida em milímetros -> "1.200 mm". */
export function formatMillimeters(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value, { decimals: 0 })} mm`;
}

/**
 * Valor para preencher campos de formulário: vírgula decimal, sem separador de
 * milhar e sem zeros à direita ("1234,5"). Compatível com parseDecimalBR.
 */
export function toInputDecimal(value: DecimalInput | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const s = dec(value).toFixed();
  const trimmed = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return trimmed.replace(".", ",");
}
