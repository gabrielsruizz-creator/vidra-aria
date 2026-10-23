import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CostLineType } from "@/domain/costing/types";
import type { DecimalInput } from "@/domain/shared/decimal";
import { formatCurrency, formatDate, formatPercent, formatQuantity } from "@/lib/format";

export const LINE_TYPE_LABELS: Record<CostLineType, string> = {
  material: "Material",
  mao_de_obra: "Mão de obra",
  instalacao: "Instalação",
  custo_indireto: "Indireto",
  frete: "Frete",
  outro_custo: "Outro custo",
  deducao_venda: "Dedução",
};

export type CostLineView = {
  key: string;
  lineType: CostLineType;
  description: string;
  materialCode?: string | null;
  supplierName?: string | null;
  unitCode?: string | null;
  quantityNet?: DecimalInput | null;
  wastePercent?: DecimalInput | null;
  quantityGross?: DecimalInput | null;
  unitCost?: DecimalInput | null;
  rate?: DecimalInput | null;
  amount: DecimalInput;
  priceQuotedAt?: string | null;
};

export function CostLinesTable({ lines }: { lines: CostLineView[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Fornecedor / cotação</TableHead>
          <TableHead className="text-right">Qtd. líquida</TableHead>
          <TableHead className="text-right">Perda</TableHead>
          <TableHead className="text-right">Qtd. bruta</TableHead>
          <TableHead className="text-right">Custo unit.</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l) => {
          const isRate = l.lineType === "custo_indireto" || l.lineType === "deducao_venda";
          return (
            <TableRow key={l.key}>
              <TableCell>
                <Badge variant="outline">{LINE_TYPE_LABELS[l.lineType]}</Badge>
              </TableCell>
              <TableCell className="max-w-80 whitespace-normal">
                {l.materialCode ? <span className="font-medium">{l.materialCode} · </span> : null}
                {l.description}
              </TableCell>
              <TableCell className="text-xs">
                {l.supplierName ?? "—"}
                {l.priceQuotedAt ? <span className="block text-muted-foreground">cotado em {formatDate(l.priceQuotedAt)}</span> : null}
              </TableCell>
              <TableCell className="tabular text-right">
                {l.quantityNet !== null && l.quantityNet !== undefined && !isRate ? `${formatQuantity(l.quantityNet, 4)} ${l.unitCode ?? ""}` : "—"}
              </TableCell>
              <TableCell className="tabular text-right">
                {l.wastePercent !== null && l.wastePercent !== undefined ? formatPercent(l.wastePercent) : "—"}
              </TableCell>
              <TableCell className="tabular text-right">
                {l.quantityGross !== null && l.quantityGross !== undefined ? `${formatQuantity(l.quantityGross, 4)} ${l.unitCode ?? ""}` : "—"}
              </TableCell>
              <TableCell className="tabular text-right">
                {isRate && l.rate !== null && l.rate !== undefined
                  ? l.lineType === "custo_indireto" && l.description.includes("por hora")
                    ? `${formatCurrency(l.rate)}/h`
                    : formatPercent(l.rate)
                  : l.unitCost !== null && l.unitCost !== undefined
                    ? formatCurrency(l.unitCost, 4)
                    : "—"}
              </TableCell>
              <TableCell className="tabular text-right font-medium">{formatCurrency(l.amount)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
