import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { addDaysISO, toInputDecimal, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { listCustomerOptions } from "@/server/repositories/customers";
import { getSettings } from "@/server/repositories/reference";

import { createQuote } from "../actions";
import { QuoteHeaderForm } from "../quote-header-form";

export const metadata: Metadata = { title: "Novo orçamento" };

export default async function NewQuotePage({ searchParams }: PageProps<"/orcamentos/novo">) {
  const user = await requireMember();
  const sp = await searchParams;
  const db = await createClient();
  const [customers, settings] = await Promise.all([listCustomerOptions(db), getSettings(db)]);
  const today = todayISO();
  return (
    <>
      <PageHeader title="Novo orçamento" description="Depois de criar, adicione os itens e calcule custos e preços." />
      <Card>
        <CardContent>
          <QuoteHeaderForm
            action={createQuote}
            customers={customers}
            maxDiscountPercent={user.role === "admin" ? "100" : user.maxDiscountPercent}
            submitLabel="Criar orçamento"
            values={{
              customer_id: typeof sp.cliente === "string" ? sp.cliente : "",
              title: "",
              issue_date: today,
              valid_until: addDaysISO(today, settings.quoteValidityDays),
              target_margin_percent: toInputDecimal(settings.defaultTargetMarginPercent),
              discount_percent: "0",
              freight_amount: "0",
              other_costs_amount: "0",
              other_costs_description: "",
              payment_terms: settings.defaultPaymentTerms ?? "",
              delivery_terms: "",
              customer_notes: "",
              internal_notes: "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
