import { AlertTriangle } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dec, HUNDRED, ONE } from "@/domain/shared/decimal";
import { formatCurrency, formatDateTime, formatMillimeters, formatPercent, formatQuantity } from "@/lib/format";
import type { SnapshotDetail } from "@/server/repositories/quotes";

import { CostLinesTable } from "./cost-lines-table";

const n = (v: number | string | null | undefined) => (v === null || v === undefined ? null : String(v));

/** Visão INTERNA da fotografia de custos (nunca exibida ao cliente). */
export function SnapshotView({ detail }: { detail: SnapshotDetail }) {
  const s = detail.snapshot;
  const finalPrice = dec(String(s.final_price));
  const deductionsPct = dec(String(s.sale_deductions_percent));
  const breakEven = deductionsPct.lt(100) ? dec(String(s.total_cost)).div(ONE.minus(deductionsPct.div(HUNDRED))) : null;
  const marginTone = dec(String(s.net_profit)).isNegative()
    ? "destructive"
    : dec(String(s.net_margin_percent)).lt(dec(String(s.target_margin_percent)))
      ? "warning"
      : "success";

  const costRows: [string, number | string][] = [
    ["Materiais (consumo com perdas)", s.material_cost],
    ["Mão de obra direta (fabricação)", s.labor_cost],
    ["Instalação", s.installation_cost],
    ["Custos específicos dos itens", s.item_extra_cost],
    ["Frete do orçamento", s.freight_cost],
    ["Outros custos do orçamento", s.other_cost],
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Custo total" value={formatCurrency(n(s.total_cost))} hint={`Variável ${formatCurrency(n(s.variable_cost))} · indireto ${formatCurrency(n(s.overhead_cost))}`} />
        <StatCard
          label="Preço recomendado"
          value={formatCurrency(n(s.list_price))}
          hint={`Margem alvo ${formatPercent(n(s.target_margin_percent))} · equilíbrio ${formatCurrency(breakEven)}`}
        />
        <StatCard
          label="Preço final"
          value={formatCurrency(finalPrice)}
          hint={Number(s.discount_amount) ? `Desconto ${formatPercent(n(s.discount_percent))} (${formatCurrency(n(s.discount_amount))})` : "Sem desconto"}
        />
        <StatCard
          label="Lucro líquido"
          value={formatCurrency(n(s.net_profit))}
          tone={marginTone}
          hint={`${formatPercent(n(s.net_margin_percent))} do preço · contribuição ${formatPercent(n(s.contribution_margin_percent))}`}
        />
      </div>

      {s.warnings.length ? (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>Avisos do cálculo</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {s.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Composição do custo</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableBody>
                {costRows.map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(n(value))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Custos variáveis</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.variable_cost))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Custos indiretos (rateio)</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.overhead_cost))}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Custo total</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.total_cost))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Preço recomendado</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.list_price))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>(−) Desconto ({formatPercent(n(s.discount_percent))})</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.discount_amount))}</TableCell>
                </TableRow>
                <TableRow className="font-medium">
                  <TableCell>Preço final</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.final_price))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>(−) Tributos e comissões ({formatPercent(n(s.sale_deductions_percent))})</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.sale_deductions_amount))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>(−) Custos variáveis</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.variable_cost))}</TableCell>
                </TableRow>
                <TableRow className="font-medium">
                  <TableCell>Margem de contribuição ({formatPercent(n(s.contribution_margin_percent))})</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.contribution_margin))}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>(−) Custos indiretos</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.overhead_cost))}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Lucro líquido ({formatPercent(n(s.net_margin_percent))})</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(s.net_profit))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custo e preço por item</CardTitle>
          <CardDescription>Valores da fotografia nº {s.sequence} · motor v{s.engine_version} · {formatDateTime(s.calculated_at)}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Medidas</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Materiais</TableHead>
                <TableHead className="text-right">MO + inst.</TableHead>
                <TableHead className="text-right">Rateios</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Preço unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.position}</TableCell>
                  <TableCell>
                    {i.product_code} <span className="text-xs text-muted-foreground">v{i.version_number}</span>
                    <p className="max-w-56 truncate text-xs text-muted-foreground">{i.description ?? i.product_name}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {i.width_mm && i.height_mm ? `${formatMillimeters(i.width_mm)} × ${formatMillimeters(i.height_mm)}` : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatQuantity(n(i.quantity))}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(i.material_cost))}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(dec(String(i.labor_cost)).plus(String(i.installation_cost)))}</TableCell>
                  <TableCell className="tabular text-right">
                    {formatCurrency(dec(String(i.overhead_cost)).plus(String(i.allocated_freight)).plus(String(i.allocated_other_cost)).plus(String(i.extra_cost)))}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(i.unit_cost))}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(i.unit_list_price))}</TableCell>
                  <TableCell className="tabular text-right font-medium">{formatCurrency(n(i.total_list_price))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Necessidade de compra (estimativa)</CardTitle>
          <CardDescription>
            Consumo bruto total arredondado para a unidade de compra da oferta usada. Não considera plano de corte nem sobras em
            estoque. Custo da compra: {formatCurrency(n(s.purchase_need_cost))} (o preço é formado pelo custo de consumo:{" "}
            {formatCurrency(n(s.material_cost))}).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Consumo bruto</TableHead>
                <TableHead className="text-right">Comprar</TableHead>
                <TableHead className="text-right">Custo unit. compra</TableHead>
                <TableHead className="text-right">Custo da compra</TableHead>
                <TableHead className="text-right">Sobra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.needs.map((nd) => (
                <TableRow key={nd.id}>
                  <TableCell>
                    <span className="font-medium">{nd.material_code}</span>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">{nd.material_description}</p>
                  </TableCell>
                  <TableCell>{nd.supplier_name ?? "—"}</TableCell>
                  <TableCell className="tabular text-right">
                    {formatQuantity(n(nd.gross_consumption), 4)} {nd.consumption_unit_code}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatQuantity(n(nd.purchase_quantity), 0)} {nd.purchase_unit_code}
                    <span className="block text-xs text-muted-foreground">
                      de {formatQuantity(n(nd.units_per_purchase), 4)} {nd.consumption_unit_code}
                    </span>
                  </TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(nd.purchase_unit_cost), 4)}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(n(nd.purchase_cost))}</TableCell>
                  <TableCell className="tabular text-right">
                    {formatQuantity(n(nd.leftover_quantity), 4)} {nd.consumption_unit_code}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memória de cálculo</CardTitle>
          <CardDescription>Cada linha guarda o preço, o fornecedor e a data da cotação usados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 px-0">
          {detail.items.map((i) => {
            const lines = detail.lines.filter((l) => l.snapshot_item_id === i.id);
            return (
              <details key={i.id} className="border-t px-5 py-2 first:border-t-0">
                <summary className="cursor-pointer text-sm font-medium">
                  Item {i.position} · {i.product_code} — {lines.length} linhas
                </summary>
                <div className="-mx-5 mt-2">
                  <CostLinesTable
                    lines={lines.map((l) => ({
                      key: l.id,
                      lineType: l.line_type,
                      description: l.description,
                      materialCode: l.material_code,
                      supplierName: l.supplier_name,
                      unitCode: l.unit_code,
                      quantityNet: n(l.quantity_net),
                      wastePercent: n(l.waste_percent),
                      quantityGross: n(l.quantity_gross),
                      unitCost: n(l.unit_cost),
                      rate: n(l.rate),
                      amount: String(l.amount),
                      priceQuotedAt: l.price_quoted_at,
                    }))}
                  />
                </div>
              </details>
            );
          })}
          {detail.lines.some((l) => l.snapshot_item_id === null) ? (
            <details className="border-t px-5 py-2">
              <summary className="cursor-pointer text-sm font-medium">Deduções sobre a venda</summary>
              <div className="-mx-5 mt-2">
                <CostLinesTable
                  lines={detail.lines
                    .filter((l) => l.snapshot_item_id === null)
                    .map((l) => ({ key: l.id, lineType: l.line_type, description: l.description, rate: n(l.rate), amount: String(l.amount) }))}
                />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
