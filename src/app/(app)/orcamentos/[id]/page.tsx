import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, FileText, Trash2 } from "lucide-react";

import { SnapshotView } from "@/components/costing/snapshot-view";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteStatusBadge } from "@/components/shared/quote-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuoteNumber, QUOTE_TRANSITIONS, TRANSITION_LABELS } from "@/domain/quotes/status";
import { formatCurrency, formatDateTime, formatMillimeters, formatPercent, formatQuantity, toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listCustomerOptions } from "@/server/repositories/customers";
import { listQuotableProducts } from "@/server/repositories/products";
import { getQuote, getSnapshotDetail, listQuoteItems, listSnapshots } from "@/server/repositories/quotes";

import {
  addQuoteItem,
  calculateQuoteAction,
  changeQuoteStatus,
  deleteQuote,
  duplicateQuote,
  removeQuoteItem,
  updateInternalNotes,
  updateQuoteHeader,
} from "../actions";
import { QuoteHeaderForm } from "../quote-header-form";
import { CalculateButton } from "./calculate-button";
import { InternalNotesForm } from "./internal-notes-form";
import { AddItemForm } from "./item-form";

export const metadata: Metadata = { title: "Orçamento" };

const n = (v: number | string | null | undefined) => (v === null || v === undefined ? null : String(v));

export default async function QuotePage({ params, searchParams }: PageProps<"/orcamentos/[id]">) {
  const user = await requireMember();
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const quote = await getQuote(db, id).catch(() => null);
  if (!quote) notFound();

  const [items, snapshots] = await Promise.all([listQuoteItems(db, id), listSnapshots(db, id)]);
  const selectedSnapshotId =
    (typeof sp.fotografia === "string" && snapshots.some((s) => s.id === sp.fotografia) ? sp.fotografia : null) ??
    quote.current_snapshot_id ??
    null;
  const detail = selectedSnapshotId ? await getSnapshotDetail(db, selectedSnapshotId) : null;

  const draft = quote.status === "rascunho";
  const canEdit = isManager(user) || quote.created_by === user.id;
  const editable = draft && canEdit;
  const [customers, products] = editable
    ? await Promise.all([listCustomerOptions(db), listQuotableProducts(db)])
    : [quote.customer ? [{ id: quote.customer.id, name: quote.customer.name, trade_name: quote.customer.trade_name }] : [], []];
  if (editable && quote.customer && !customers.some((c) => c.id === quote.customer_id)) {
    customers.push({ id: quote.customer.id, name: quote.customer.name, trade_name: quote.customer.trade_name });
  }

  const outdated = draft && items.length > 0 && !quote.current_snapshot_id;
  const transitions = canEdit ? QUOTE_TRANSITIONS[quote.status] : [];
  const viewingOld = detail && detail.snapshot.id !== quote.current_snapshot_id;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {formatQuoteNumber(quote.number)} <QuoteStatusBadge status={quote.status} />
          </span>
        }
        description={
          <>
            {quote.customer ? (
              <Link href={`/clientes/${quote.customer.id}`} className="underline">
                {quote.customer.name}
              </Link>
            ) : null}
            {quote.title ? ` · ${quote.title}` : null}
          </>
        }
        actions={
          <>
            {quote.current_snapshot_id ? (
              <Button asChild variant="outline">
                <Link href={`/orcamentos/${id}/proposta`}>
                  <FileText /> Proposta ao cliente
                </Link>
              </Button>
            ) : null}
            <form action={duplicateQuote.bind(null, id)}>
              <Button type="submit" variant="outline">
                <Copy /> Duplicar
              </Button>
            </form>
            {draft && canEdit && snapshots.length === 0 ? (
              <form action={deleteQuote.bind(null, id)}>
                <Button type="submit" variant="ghost" className="text-destructive">
                  <Trash2 /> Excluir
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      {typeof sp.erro === "string" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{sp.erro}</AlertDescription>
        </Alert>
      ) : null}

      {transitions.length ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <span className="mr-2 text-sm text-muted-foreground">Status:</span>
          {transitions.map((to) => (
            <form key={to} action={changeQuoteStatus.bind(null, id, quote.status, to)}>
              <Button
                type="submit"
                size="sm"
                variant={to === "aprovado" ? "default" : to === "cancelado" || to === "recusado" ? "ghost" : "secondary"}
                disabled={to === "enviado" && !quote.current_snapshot_id}
                title={to === "enviado" && !quote.current_snapshot_id ? "Calcule o orçamento antes de enviar." : undefined}
              >
                {TRANSITION_LABELS[to]}
              </Button>
            </form>
          ))}
          {quote.sent_at ? <span className="ml-auto text-xs text-muted-foreground">Enviado em {formatDateTime(quote.sent_at)}</span> : null}
        </div>
      ) : null}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
            <CardDescription>
              Medidas em milímetros. Cada item usa a versão publicada da ficha técnica no momento da inclusão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Medidas (L × A)</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Instalação</TableHead>
                  <TableHead className="text-right">Custo específico</TableHead>
                  <TableHead className="text-right">Preço unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {editable ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="font-medium">{i.product?.code}</span>{" "}
                      <span className="text-xs text-muted-foreground">ficha v{i.version?.version_number}</span>
                      {i.version?.status === "arquivada" ? <Badge variant="warning" className="ml-1">ficha antiga</Badge> : null}
                      <p className="text-xs text-muted-foreground">{i.description ?? i.product?.name}</p>
                    </TableCell>
                    <TableCell>{i.width_mm && i.height_mm ? `${formatMillimeters(i.width_mm)} × ${formatMillimeters(i.height_mm)}` : "—"}</TableCell>
                    <TableCell className="tabular text-right">{formatQuantity(String(i.quantity))}</TableCell>
                    <TableCell>{i.include_installation ? "Sim" : "Não"}</TableCell>
                    <TableCell className="tabular text-right">{Number(i.extra_cost) ? formatCurrency(String(i.extra_cost)) : "—"}</TableCell>
                    <TableCell className="tabular text-right">{outdated ? "—" : formatCurrency(n(i.unit_price))}</TableCell>
                    <TableCell className="tabular text-right font-medium">{outdated ? "—" : formatCurrency(n(i.total_price))}</TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <form action={removeQuoteItem.bind(null, id, i.id)}>
                          <Button type="submit" variant="ghost" size="icon" aria-label="Remover item">
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum item. Adicione produtos abaixo.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {editable ? (
              <div className="space-y-5 border-t px-5 pt-5">
                <AddItemForm action={addQuoteItem.bind(null, id)} products={products} />
                <div className="rounded-lg border bg-muted/40 p-4">
                  {outdated ? (
                    <p className="mb-3 text-sm font-medium text-warning">
                      Itens ou parâmetros mudaram desde o último cálculo: recalcule antes de enviar.
                    </p>
                  ) : (
                    <p className="mb-3 text-sm text-muted-foreground">
                      O cálculo usa os preços de fornecedores e taxas vigentes agora e grava uma fotografia imutável.
                    </p>
                  )}
                  <CalculateButton action={calculateQuoteAction.bind(null, id)} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {detail ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Custos e margens (visão interna)</h2>
              {viewingOld ? (
                <Badge variant="warning">Fotografia antiga nº {detail.snapshot.sequence}</Badge>
              ) : (
                <Badge variant="secondary">Fotografia vigente nº {detail.snapshot.sequence}</Badge>
              )}
            </div>
            <SnapshotView detail={detail} />
          </section>
        ) : (
          <Alert>
            <AlertTitle>Ainda sem cálculo</AlertTitle>
            <AlertDescription>Adicione itens e clique em “Calcular e salvar fotografia”.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados comerciais</CardTitle>
            <CardDescription>
              {draft ? "Alterar margem, desconto, frete ou outros custos exige recalcular." : "Somente leitura fora do rascunho."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuoteHeaderForm
              action={updateQuoteHeader.bind(null, id)}
              customers={customers}
              readOnly={!editable}
              maxDiscountPercent={user.role === "admin" ? "100" : user.maxDiscountPercent}
              values={{
                customer_id: quote.customer_id,
                title: quote.title ?? "",
                issue_date: quote.issue_date,
                valid_until: quote.valid_until ?? "",
                target_margin_percent: toInputDecimal(String(quote.target_margin_percent)),
                discount_percent: toInputDecimal(String(quote.discount_percent)),
                freight_amount: toInputDecimal(String(quote.freight_amount)),
                other_costs_amount: toInputDecimal(String(quote.other_costs_amount)),
                other_costs_description: quote.other_costs_description ?? "",
                payment_terms: quote.payment_terms ?? "",
                delivery_terms: quote.delivery_terms ?? "",
                customer_notes: quote.customer_notes ?? "",
                internal_notes: quote.internal_notes ?? "",
              }}
            />
            {!draft && canEdit ? (
              <div className="mt-6 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Observações internas</p>
                <InternalNotesForm action={updateInternalNotes.bind(null, id)} value={quote.internal_notes ?? ""} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de cálculos</CardTitle>
            <CardDescription>Fotografias imutáveis. A vigente é a usada na proposta.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {snapshots.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Calculado em</TableHead>
                    <TableHead className="text-right">Custo total</TableHead>
                    <TableHead className="text-right">Preço final</TableHead>
                    <TableHead className="text-right">Margem líq.</TableHead>
                    <TableHead>Avisos</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.sequence} {s.id === quote.current_snapshot_id ? <Badge variant="secondary">vigente</Badge> : null}
                      </TableCell>
                      <TableCell>{formatDateTime(s.calculated_at)}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(n(s.total_cost))}</TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(n(s.final_price))}</TableCell>
                      <TableCell className="tabular text-right">{formatPercent(n(s.net_margin_percent))}</TableCell>
                      <TableCell>{s.warnings.length || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orcamentos/${id}?fotografia=${s.id}`} className="text-sm text-primary hover:underline">
                          Ver
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 text-sm text-muted-foreground">Nenhum cálculo salvo.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
