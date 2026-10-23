import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteStatusBadge } from "@/components/shared/quote-status-badge";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuoteNumber, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/domain/quotes/status";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { listQuotes } from "@/server/repositories/quotes";

export const metadata: Metadata = { title: "Orçamentos" };

export default async function QuotesPage({ searchParams }: PageProps<"/orcamentos">) {
  await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = (Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).find((s) => s === sp.status) ?? "";
  const db = await createClient();
  const quotes = await listQuotes(db, { q, status });
  return (
    <>
      <PageHeader
        title="Orçamentos"
        actions={
          <Button asChild>
            <Link href="/orcamentos/novo">
              <Plus /> Novo orçamento
            </Link>
          </Button>
        }
      />
      <SearchBar q={q} placeholder="Número, cliente ou referência">
        <NativeSelect name="status" defaultValue={status} className="sm:w-44" aria-label="Status">
          <option value="">Todos os status</option>
          {(Object.entries(QUOTE_STATUS_LABELS) as [QuoteStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </SearchBar>
      {quotes.length === 0 ? (
        <EmptyState title="Nenhum orçamento encontrado" />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Margem líq.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((qt) => (
                  <TableRow key={qt.id}>
                    <TableCell>
                      <Link href={`/orcamentos/${qt.id}`} className="font-medium hover:underline">
                        {formatQuoteNumber(qt.number)}
                      </Link>
                    </TableCell>
                    <TableCell>{qt.customer?.name}</TableCell>
                    <TableCell className="max-w-64 truncate">{qt.title ?? "—"}</TableCell>
                    <TableCell>{formatDate(qt.issue_date)}</TableCell>
                    <TableCell className="space-x-1">
                      <QuoteStatusBadge status={qt.status} />
                      {qt.status === "rascunho" && !qt.current_snapshot_id ? <Badge variant="warning">Calcular</Badge> : null}
                    </TableCell>
                    <TableCell className="tabular text-right">{formatCurrency(qt.total_price === null ? null : String(qt.total_price))}</TableCell>
                    <TableCell className="tabular text-right">
                      {qt.net_margin_percent === null ? "—" : formatPercent(String(qt.net_margin_percent), 1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
