import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, PackageX, Plus, TagsIcon } from "lucide-react";

import { FreshnessBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteStatusBadge } from "@/components/shared/quote-status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { summarizeQuotes } from "@/domain/dashboard/metrics";
import { offerFreshness } from "@/domain/pricing/offers";
import { formatQuoteNumber, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/domain/quotes/status";
import { addDaysISO, formatCurrency, formatDate, formatPercent, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { listOffers } from "@/server/repositories/offers";
import { getSettings } from "@/server/repositories/reference";
import { unwrap } from "@/server/repositories/util";

export const metadata: Metadata = { title: "Painel" };

const PERIODS = [30, 90, 365] as const;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireMember();
  const sp = await searchParams;
  const period = PERIODS.find((p) => String(p) === sp.periodo) ?? 90;
  const today = todayISO();
  const since = addDaysISO(today, -period);
  const db = await createClient();

  const [quotesRes, settings, offers, materialsRes, productsRes] = await Promise.all([
    db
      .from("quotes")
      .select("id, number, status, title, issue_date, total_price, net_profit, current_snapshot_id, customer:customers(name)")
      .gte("issue_date", since)
      .order("issue_date", { ascending: false })
      .limit(2000),
    getSettings(db),
    listOffers(db, { activeOnly: true }),
    db.from("materials").select("id, internal_code, description").eq("active", true).limit(5000),
    db.from("products").select("id, code, name, versions:product_versions(status)").eq("active", true).limit(2000),
  ]);
  const quotes = unwrap(quotesRes);
  const metrics = summarizeQuotes(
    quotes.map((q) => ({
      status: q.status,
      totalPrice: q.total_price === null ? null : String(q.total_price),
      netProfit: q.net_profit === null ? null : String(q.net_profit),
    })),
  );

  const staleOffers = offers
    .map((o) => ({ o, fresh: offerFreshness(o, today, settings.priceStaleAfterDays) }))
    .filter((x) => x.fresh.status !== "vigente")
    .sort((a, b) => b.fresh.ageDays - a.fresh.ageDays);
  const materialsWithOffer = new Set(offers.map((o) => o.materialId));
  const materialsWithoutOffer = unwrap(materialsRes).filter((m) => !materialsWithOffer.has(m.id));
  const productsWithoutVersion = unwrap(productsRes).filter((p) => !p.versions.some((v) => v.status === "publicada"));
  const draftsToCalculate = quotes.filter((q) => q.status === "rascunho" && !q.current_snapshot_id);

  return (
    <>
      <PageHeader
        title="Painel"
        description={`Orçamentos emitidos nos últimos ${period} dias.`}
        actions={
          <>
            <form method="get" className="flex items-center gap-2">
              <NativeSelect name="periodo" defaultValue={String(period)} className="w-40" aria-label="Período">
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    Últimos {p} dias
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" variant="secondary">
                Aplicar
              </Button>
            </form>
            <Button asChild>
              <Link href="/orcamentos/novo">
                <Plus /> Novo orçamento
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçamentos"
          value={metrics.total}
          hint={`${metrics.byStatus.rascunho} rascunho(s) · ${metrics.byStatus.enviado} enviado(s)`}
        />
        <StatCard label="Valor cotado" value={formatCurrency(metrics.quotedValue)} hint={`${metrics.quotedCount} orçamento(s) enviados ao cliente`} />
        <StatCard
          label="Aprovados"
          value={formatCurrency(metrics.approvedValue)}
          tone="success"
          hint={`${metrics.approvedCount} aprovado(s) · conversão ${formatPercent(metrics.conversionPercent, 1)}`}
        />
        <StatCard
          label="Margem líquida estimada"
          value={formatPercent(metrics.weightedNetMarginPercent, 1)}
          tone={metrics.weightedNetMarginPercent?.isNegative() ? "destructive" : "default"}
          hint={`Ponderada pelo valor · aprovados: ${formatPercent(metrics.approvedNetMarginPercent, 1)}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Orçamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.slice(0, 8).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/orcamentos/${q.id}`} className="font-medium hover:underline">
                        {formatQuoteNumber(q.number)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{q.customer?.name}</TableCell>
                    <TableCell>{formatDate(q.issue_date)}</TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(q.total_price === null ? null : String(q.total_price))}</TableCell>
                  </TableRow>
                ))}
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum orçamento no período.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="flex flex-wrap gap-2 px-5 pt-4 text-xs text-muted-foreground">
              {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((s) => (
                <span key={s}>
                  {QUOTE_STATUS_LABELS[s]}: <strong className="text-foreground">{metrics.byStatus[s]}</strong>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" /> Alertas
            </CardTitle>
            <CardDescription>Preços considerados desatualizados após {settings.priceStaleAfterDays} dias da cotação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <p className="mb-2 flex items-center gap-2 font-medium">
                <TagsIcon className="size-4" /> {staleOffers.length} preço(s) vencido(s) ou desatualizado(s)
              </p>
              <ul className="space-y-1.5">
                {staleOffers.slice(0, 6).map(({ o, fresh }) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <Link href={`/precos/${o.id}`} className="truncate hover:underline">
                      {o.materialCode} · {o.supplierName}
                    </Link>
                    <FreshnessBadge status={fresh.status} />
                  </li>
                ))}
              </ul>
              {staleOffers.length > 6 ? (
                <Link href="/precos?situacao=desatualizada" className="mt-1 inline-block text-xs text-primary hover:underline">
                  Ver todos
                </Link>
              ) : null}
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 font-medium">
                <PackageX className="size-4" /> {materialsWithoutOffer.length} material(is) ativo(s) sem preço
              </p>
              <ul className="space-y-1">
                {materialsWithoutOffer.slice(0, 5).map((m) => (
                  <li key={m.id} className="truncate">
                    <Link href={`/materiais/${m.id}`} className="hover:underline">
                      {m.internal_code} · {m.description}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {productsWithoutVersion.length ? (
              <p>
                <strong>{productsWithoutVersion.length}</strong> produto(s) ativo(s) sem ficha publicada (não podem ser orçados).{" "}
                <Link href="/produtos" className="text-primary hover:underline">
                  Revisar
                </Link>
              </p>
            ) : null}
            {draftsToCalculate.length ? (
              <p>
                <strong>{draftsToCalculate.length}</strong> rascunho(s) sem cálculo atualizado.{" "}
                <Link href="/orcamentos?status=rascunho" className="text-primary hover:underline">
                  Abrir
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
