import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { costPerConsumptionUnit } from "@/domain/pricing/offers";
import { formatCurrency, formatDate, formatDateTime, formatPercent, formatQuantity } from "@/lib/format";
import type { PriceHistoryRow } from "@/server/repositories/offers";

export function PriceHistoryTable({ rows, showMaterial }: { rows: PriceHistoryRow[]; showMaterial?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Registrado em</TableHead>
          {showMaterial ? <TableHead>Material</TableHead> : null}
          <TableHead>Fornecedor</TableHead>
          <TableHead>Evento</TableHead>
          <TableHead className="text-right">Preço</TableHead>
          <TableHead>Embalagem</TableHead>
          <TableHead className="text-right">Desc. / Trib.</TableHead>
          <TableHead className="text-right">Frete/un</TableHead>
          <TableHead className="text-right">Custo/un consumo</TableHead>
          <TableHead>Cotação</TableHead>
          <TableHead>Validade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatDateTime(r.recordedAt)}</TableCell>
            {showMaterial ? <TableCell>{r.materialCode}</TableCell> : null}
            <TableCell>{r.supplierName}</TableCell>
            <TableCell>
              <Badge variant={r.changeType === "criacao" ? "secondary" : "outline"}>
                {r.changeType === "criacao" ? "Cadastro" : "Alteração"}
              </Badge>
            </TableCell>
            <TableCell className="tabular text-right">{formatCurrency(r.price, 4)}</TableCell>
            <TableCell>
              {r.purchaseUnitCode} × {formatQuantity(r.packageQuantity, 6)}
            </TableCell>
            <TableCell className="tabular text-right text-xs">
              {formatPercent(r.discountPercent)} / {formatPercent(r.purchaseTaxPercent)}
            </TableCell>
            <TableCell className="tabular text-right">{r.freightPerUnit === null ? "—" : formatCurrency(r.freightPerUnit, 4)}</TableCell>
            <TableCell className="tabular text-right">{formatCurrency(costPerConsumptionUnit(r), 4)}</TableCell>
            <TableCell>{formatDate(r.quotedAt)}</TableCell>
            <TableCell>{formatDate(r.validUntil)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
