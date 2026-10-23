import type { Metadata } from "next";

import { SimpleForm } from "@/components/forms/simple-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { getSettings } from "@/server/repositories/reference";

import { saveCompanySettings } from "./actions";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireMember();
  const db = await createClient();
  const s = await getSettings(db);
  return (
    <>
      <PageHeader title="Parâmetros gerais" description="Somente administradores podem alterar." />
      <Card>
        <CardHeader>
          <CardTitle>Empresa e orçamentos</CardTitle>
          <CardDescription>
            A margem padrão é apenas uma sugestão para novos orçamentos. O sistema não presume margens: defina conforme a
            política da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleForm
            action={saveCompanySettings}
            readOnly={user.role !== "admin"}
            submitLabel="Salvar parâmetros"
            values={{
              company_name: s.companyName ?? "",
              default_target_margin_percent: toInputDecimal(s.defaultTargetMarginPercent),
              price_stale_after_days: String(s.priceStaleAfterDays),
              quote_validity_days: String(s.quoteValidityDays),
              default_payment_terms: s.defaultPaymentTerms ?? "",
              proposal_footer: s.proposalFooter ?? "",
            }}
            fields={[
              { kind: "text", name: "company_name", label: "Nome da empresa (na proposta)" },
              { kind: "decimal", name: "default_target_margin_percent", label: "Margem líquida sugerida (%)", hint: "Opcional." },
              {
                kind: "integer",
                name: "price_stale_after_days",
                label: "Preço desatualizado após (dias)",
                required: true,
                hint: "Padrão do sistema: 90 dias.",
              },
              { kind: "integer", name: "quote_validity_days", label: "Validade padrão do orçamento (dias)", required: true },
              { kind: "textarea", name: "default_payment_terms", label: "Condições de pagamento padrão", wide: true },
              { kind: "textarea", name: "proposal_footer", label: "Rodapé da proposta comercial", wide: true },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
