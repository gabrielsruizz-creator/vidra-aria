import { Badge } from "@/components/ui/badge";
import { FRESHNESS_LABELS, type OfferFreshness } from "@/domain/pricing/offers";

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>;
}

export function FreshnessBadge({ status }: { status: OfferFreshness }) {
  const variant = status === "vigente" ? "success" : status === "vencida" ? "destructive" : "warning";
  return <Badge variant={variant}>{FRESHNESS_LABELS[status]}</Badge>;
}

export function DemoBadge() {
  return <Badge variant="warning">Demonstração</Badge>;
}
