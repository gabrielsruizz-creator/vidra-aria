import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/domain/quotes/status";

const VARIANTS: Record<QuoteStatus, "secondary" | "default" | "success" | "destructive" | "warning" | "outline"> = {
  rascunho: "secondary",
  enviado: "default",
  aprovado: "success",
  recusado: "destructive",
  expirado: "warning",
  cancelado: "outline",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={VARIANTS[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}
