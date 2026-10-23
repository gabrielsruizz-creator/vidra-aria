import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuoteNumber, QUOTE_STATUS_LABELS } from "@/domain/quotes/status";
import { formatCurrency, formatDate, formatDocument } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getCustomer } from "@/server/repositories/customers";
import { unwrap } from "@/server/repositories/util";

import { saveCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: PageProps<"/clientes/[id]">) {
  await requireMember();
  const { id } = await params;
  const db = await createClient();
  const customer = await getCustomer(db, id).catch(() => null);
  if (!customer) notFound();
  const quotes = unwrap(
    await db
      .from("quotes")
      .select("id, number, title, status, issue_date, total_price")
      .eq("customer_id", id)
      .order("issue_date", { ascending: false })
      .limit(50),
  );
  return (
    <>
      <PageHeader title={customer.name} description={formatDocument(customer.document)} />
      <div className="grid gap-6">
        <Card>
          <CardContent>
            <CustomerForm
              action={saveCustomer.bind(null, id)}
              values={{
                person_type: customer.person_type,
                name: customer.name,
                trade_name: customer.trade_name ?? "",
                document: customer.document ? formatDocument(customer.document) : "",
                email: customer.email ?? "",
                phone: customer.phone ?? "",
                address_street: customer.address_street ?? "",
                address_number: customer.address_number ?? "",
                address_complement: customer.address_complement ?? "",
                address_district: customer.address_district ?? "",
                address_city: customer.address_city ?? "",
                address_state: customer.address_state ?? "",
                address_postal_code: customer.address_postal_code ?? "",
                notes: customer.notes ?? "",
                active: customer.active,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos do cliente</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {quotes.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Link href={`/orcamentos/${q.id}`} className="font-medium hover:underline">
                          {formatQuoteNumber(q.number)}
                        </Link>
                      </TableCell>
                      <TableCell>{q.title ?? "—"}</TableCell>
                      <TableCell>{formatDate(q.issue_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{QUOTE_STATUS_LABELS[q.status]}</Badge>
                      </TableCell>
                      <TableCell className="tabular text-right">{formatCurrency(q.total_price === null ? null : String(q.total_price))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 text-sm text-muted-foreground">Nenhum orçamento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
