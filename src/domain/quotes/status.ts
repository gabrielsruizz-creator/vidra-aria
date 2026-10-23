export type QuoteStatus = "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado" | "cancelado";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

/** Transições permitidas (espelham o trigger app_private.guard_quote). */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  rascunho: ["enviado", "cancelado"],
  enviado: ["aprovado", "recusado", "expirado", "cancelado", "rascunho"],
  aprovado: ["cancelado"],
  recusado: ["rascunho"],
  expirado: ["rascunho"],
  cancelado: [],
};

export const TRANSITION_LABELS: Partial<Record<QuoteStatus, string>> = {
  enviado: "Marcar como enviado",
  aprovado: "Aprovar",
  recusado: "Recusado pelo cliente",
  expirado: "Expirado",
  cancelado: "Cancelar",
  rascunho: "Reabrir para edição",
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_TRANSITIONS[from].includes(to);
}

/** Estados em que o orçamento conta como "cotado" no painel. */
export const QUOTED_STATUSES: QuoteStatus[] = ["enviado", "aprovado", "recusado", "expirado"];

export function formatQuoteNumber(n: number): string {
  return `ORC-${String(n).padStart(5, "0")}`;
}
