import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatQuoteNumber } from "@/domain/quotes/status";
import { formatCurrency, formatDate, formatDocument, formatMillimeters, formatPercent, formatQuantity } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getQuote, getSnapshotDetail } from "@/server/repositories/quotes";
import { getSettings } from "@/server/repositories/reference";
import { unwrap } from "@/server/repositories/util";

import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Proposta comercial" };

/**
 * Proposta apresentada ao cliente. Usa SOMENTE dados comerciais da fotografia
 * vigente (preços e totais); custos, margens e fornecedores nunca aparecem aqui.
 */
export default async function ProposalPage({ params }: PageProps<"/orcamentos/[id]/proposta">) {
  await requireMember();
  const { id } = await params;
  const db = await createClient();
  const quote = await getQuote(db, id).catch(() => null);
  if (!quote) notFound();
  const settings = await getSettings(db);
  const detail = quote.current_snapshot_id ? await getSnapshotDetail(db, quote.current_snapshot_id) : null;

  if (!detail) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Este orçamento ainda não foi calculado (ou foi alterado depois do último cálculo).{" "}
          <Link href={`/orcamentos/${id}`} className="underline">
            Voltar e calcular
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  const productIds = [...new Set(detail.items.map((i) => i.product_id))];
  const products = unwrap(await db.from("products").select("id, description").in("id", productIds));
  const productDescription = new Map(products.map((p) => [p.id, p.description]));
  const s = detail.snapshot;
  const c = quote.customer;
  const address = c
    ? [
        [c.address_street, c.address_number].filter(Boolean).join(", "),
        c.address_complement,
        c.address_district,
        [c.address_city, c.address_state].filter(Boolean).join("/"),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost">
          <Link href={`/orcamentos/${id}`}>
            <ArrowLeft /> Voltar à visão interna
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="rounded-xl border bg-white p-6 text-neutral-900 shadow-xs sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold">{settings.companyName ?? "Proposta comercial"}</p>
            <p className="text-sm text-neutral-500">Esquadrias de alumínio, vidros e acessórios</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold">Proposta {formatQuoteNumber(quote.number)}</p>
            <p>Emissão: {formatDate(quote.issue_date)}</p>
            {quote.valid_until ? <p>Válida até: {formatDate(quote.valid_until)}</p> : null}
          </div>
        </header>

        <section className="grid gap-1 border-b py-5 text-sm">
          <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Cliente</p>
          <p className="font-medium">{c?.name}</p>
          {c?.document ? <p>{formatDocument(c.document)}</p> : null}
          {address ? <p>{address}</p> : null}
          {[c?.phone, c?.email].filter(Boolean).length ? <p>{[c?.phone, c?.email].filter(Boolean).join(" · ")}</p> : null}
          {quote.title ? (
            <p className="mt-2">
              <span className="text-neutral-500">Referência:</span> {quote.title}
            </p>
          ) : null}
        </section>

        <section className="py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-neutral-500 uppercase">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Descrição</th>
                <th className="py-2 pr-2 text-right">Qtd.</th>
                <th className="py-2 pr-2 text-right">Unitário</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((i) => (
                <tr key={i.id} className="border-b align-top">
                  <td className="py-3 pr-2">{i.position}</td>
                  <td className="py-3 pr-2">
                    <p className="font-medium">{i.product_name}</p>
                    {i.description ? <p>{i.description}</p> : null}
                    {i.width_mm && i.height_mm ? (
                      <p className="text-neutral-500">
                        Medidas: {formatMillimeters(i.width_mm)} × {formatMillimeters(i.height_mm)} (L × A)
                      </p>
                    ) : null}
                    {productDescription.get(i.product_id) ? (
                      <p className="text-neutral-500">{productDescription.get(i.product_id)}</p>
                    ) : null}
                    <p className="text-neutral-500">{i.include_installation ? "Instalação inclusa" : "Sem instalação"}</p>
                  </td>
                  <td className="tabular py-3 pr-2 text-right">{formatQuantity(String(i.quantity))}</td>
                  <td className="tabular py-3 pr-2 text-right">{formatCurrency(String(i.unit_list_price))}</td>
                  <td className="tabular py-3 text-right">{formatCurrency(String(i.total_list_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
            {Number(s.discount_amount) > 0 ? (
              <>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular">{formatCurrency(String(s.list_price))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto ({formatPercent(String(s.discount_percent))})</span>
                  <span className="tabular">−{formatCurrency(String(s.discount_amount))}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular">{formatCurrency(String(s.final_price))}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t py-5 text-sm sm:grid-cols-2">
          {quote.payment_terms ? (
            <div>
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Condições de pagamento</p>
              <p className="whitespace-pre-line">{quote.payment_terms}</p>
            </div>
          ) : null}
          {quote.delivery_terms ? (
            <div>
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Prazo e entrega</p>
              <p className="whitespace-pre-line">{quote.delivery_terms}</p>
            </div>
          ) : null}
          {quote.customer_notes ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Observações</p>
              <p className="whitespace-pre-line">{quote.customer_notes}</p>
            </div>
          ) : null}
        </section>

        <footer className="border-t pt-5 text-xs text-neutral-500">
          {settings.proposalFooter ? <p className="whitespace-pre-line">{settings.proposalFooter}</p> : null}
          <p className="mt-2">Valores em reais (R$). Medidas em milímetros.</p>
        </footer>
      </article>
    </div>
  );
}
