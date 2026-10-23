import Link from "next/link";
import { Star } from "lucide-react";

import { FreshnessBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { costPerConsumptionUnit, effectivePurchaseUnitCost, offerFreshness } from "@/domain/pricing/offers";
import { formatCurrency, formatDate, formatPercent, formatQuantity } from "@/lib/format";
import type { OfferRow } from "@/server/repositories/offers";

export function OffersTable({
  offers,
  today,
  staleAfterDays,
  show = ["material", "supplier"],
}: {
  offers: OfferRow[];
  today: string;
  staleAfterDays: number;
  show?: ("material" | "supplier")[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {show.includes("material") ? <TableHead>Material</TableHead> : null}
          {show.includes("supplier") ? <TableHead>Fornecedor</TableHead> : null}
          <TableHead className="text-right">Preço</TableHead>
          <TableHead>Un. compra</TableHead>
          <TableHead className="text-right">Desc. / Trib.</TableHead>
          <TableHead className="text-right">Frete/un</TableHead>
          <TableHead className="text-right">Custo efetivo</TableHead>
          <TableHead className="text-right">Custo/un consumo</TableHead>
          <TableHead>Cotação</TableHead>
          <TableHead>Validade</TableHead>
          <TableHead>Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((o) => {
          const fresh = offerFreshness(o, today, staleAfterDays);
          return (
            <TableRow key={o.id} className={o.active ? undefined : "opacity-60"}>
              {show.includes("material") ? (
                <TableCell>
                  <Link href={`/precos/${o.id}`} className="font-medium hover:underline">
                    {o.materialCode}
                  </Link>
                  <p className="max-w-64 truncate text-xs text-muted-foreground">{o.materialDescription}</p>
                </TableCell>
              ) : null}
              {show.includes("supplier") ? (
                <TableCell>
                  <Link href={`/precos/${o.id}`} className="inline-flex items-center gap-1 hover:underline">
                    {o.isPreferred ? <Star className="size-3.5 fill-warning text-warning" aria-label="Preferencial" /> : null}
                    {o.supplierName}
                  </Link>
                </TableCell>
              ) : null}
              <TableCell className="tabular text-right">{formatCurrency(o.price, 4)}</TableCell>
              <TableCell>
                {o.purchaseUnitCode}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  ({formatQuantity(o.packageQuantity, 6)} {o.consumptionUnitCode})
                </span>
              </TableCell>
              <TableCell className="tabular text-right text-xs">
                {formatPercent(o.discountPercent)} / {formatPercent(o.purchaseTaxPercent)}
              </TableCell>
              <TableCell className="tabular text-right">
                {o.freightPerUnit === null ? <span className="text-xs text-muted-foreground">não informado</span> : formatCurrency(o.freightPerUnit, 4)}
              </TableCell>
              <TableCell className="tabular text-right">{formatCurrency(effectivePurchaseUnitCost(o), 4)}</TableCell>
              <TableCell className="tabular text-right font-medium">
                {formatCurrency(costPerConsumptionUnit(o), 4)}
                <span className="text-xs text-muted-foreground">/{o.consumptionUnitCode}</span>
              </TableCell>
              <TableCell>{formatDate(o.quotedAt)}</TableCell>
              <TableCell>{formatDate(o.validUntil)}</TableCell>
              <TableCell>
                {o.active ? <FreshnessBadge status={fresh.status} /> : <Badge variant="secondary">Inativa</Badge>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
