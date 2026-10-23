import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/server/auth";

import { saveCustomer } from "../actions";
import { CustomerForm, EMPTY_CUSTOMER } from "../customer-form";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewCustomerPage({ searchParams }: PageProps<"/clientes/novo">) {
  await requireMember();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Novo cliente" />
      <Card>
        <CardContent>
          <CustomerForm
            action={saveCustomer.bind(null, null)}
            values={EMPTY_CUSTOMER}
            returnTo={sp.retorno === "orcamento" ? "orcamento" : undefined}
          />
        </CardContent>
      </Card>
    </>
  );
}
