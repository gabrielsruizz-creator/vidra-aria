import type { Metadata } from "next";

import { NoPermission } from "@/components/shared/no-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { isManager, requireMember } from "@/server/auth";

import { saveSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage() {
  const user = await requireMember();
  if (!isManager(user)) return <NoPermission />;
  return (
    <>
      <PageHeader title="Novo fornecedor" />
      <Card>
        <CardContent>
          <SupplierForm
            action={saveSupplier.bind(null, null)}
            values={{ legal_name: "", trade_name: "", cnpj: "", payment_terms: "", notes: "", active: true }}
          />
        </CardContent>
      </Card>
    </>
  );
}
