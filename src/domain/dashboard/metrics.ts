import { dec, HUNDRED, sum, ZERO, type Decimal } from "@/domain/shared/decimal";
import { QUOTED_STATUSES, type QuoteStatus } from "@/domain/quotes/status";

export type QuoteSummaryRow = {
  status: QuoteStatus;
  totalPrice: string | null;
  netProfit: string | null;
};

export type QuoteMetrics = {
  total: number;
  byStatus: Record<QuoteStatus, number>;
  quotedCount: number;
  quotedValue: Decimal;
  approvedCount: number;
  approvedValue: Decimal;
  /** Aprovados ÷ (aprovados + recusados + expirados), em %. */
  conversionPercent: Decimal | null;
  /** Margem líquida ponderada pelo valor (Σ lucro ÷ Σ preço), em %. */
  weightedNetMarginPercent: Decimal | null;
  approvedNetMarginPercent: Decimal | null;
};

function weightedMargin(rows: QuoteSummaryRow[]): Decimal | null {
  const priced = rows.filter((r) => r.totalPrice !== null && r.netProfit !== null);
  const revenue = sum(priced.map((r) => r.totalPrice!));
  if (revenue.isZero()) return null;
  return sum(priced.map((r) => r.netProfit!)).div(revenue).times(HUNDRED);
}

/**
 * Indicadores comerciais. "Cotado" = orçamentos que saíram do rascunho
 * (enviados, aprovados, recusados ou expirados); cancelados não contam.
 */
export function summarizeQuotes(rows: QuoteSummaryRow[]): QuoteMetrics {
  const byStatus: Record<QuoteStatus, number> = {
    rascunho: 0,
    enviado: 0,
    aprovado: 0,
    recusado: 0,
    expirado: 0,
    cancelado: 0,
  };
  for (const r of rows) byStatus[r.status] += 1;

  const quoted = rows.filter((r) => QUOTED_STATUSES.includes(r.status));
  const approved = rows.filter((r) => r.status === "aprovado");
  const decided = byStatus.aprovado + byStatus.recusado + byStatus.expirado;

  return {
    total: rows.length,
    byStatus,
    quotedCount: quoted.length,
    quotedValue: sum(quoted.map((r) => r.totalPrice ?? ZERO)),
    approvedCount: approved.length,
    approvedValue: sum(approved.map((r) => r.totalPrice ?? ZERO)),
    conversionPercent: decided === 0 ? null : dec(byStatus.aprovado).div(decided).times(HUNDRED),
    weightedNetMarginPercent: weightedMargin(quoted),
    approvedNetMarginPercent: weightedMargin(approved),
  };
}
