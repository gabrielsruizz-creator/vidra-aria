import { Badge } from "@/components/ui/badge";

const LABELS = { rascunho: "Rascunho", publicada: "Publicada", arquivada: "Arquivada" } as const;

export function VersionStatusBadge({ status }: { status: keyof typeof LABELS }) {
  const variant = status === "publicada" ? "success" : status === "rascunho" ? "warning" : "secondary";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
