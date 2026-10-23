"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions";

export type QuoteHeaderValues = {
  customer_id: string;
  title: string;
  issue_date: string;
  valid_until: string;
  target_margin_percent: string;
  discount_percent: string;
  freight_amount: string;
  other_costs_amount: string;
  other_costs_description: string;
  payment_terms: string;
  delivery_terms: string;
  customer_notes: string;
  internal_notes: string;
};

export function QuoteHeaderForm({
  action,
  values,
  customers,
  maxDiscountPercent,
  readOnly,
  submitLabel = "Salvar",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: QuoteHeaderValues;
  customers: { id: string; name: string; trade_name: string | null }[];
  maxDiscountPercent: string;
  readOnly?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <fieldset disabled={readOnly} className="contents">
        <FormField
          label="Cliente"
          htmlFor="customer_id"
          required
          error={err("customer_id")}
          className="lg:col-span-2"
          hint={
            readOnly ? undefined : (
              <Link href="/clientes/novo?retorno=orcamento" className="underline">
                Cadastrar novo cliente
              </Link>
            )
          }
        >
          <NativeSelect id="customer_id" name="customer_id" defaultValue={values.customer_id} required>
            <option value="">Selecione…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.trade_name ? ` (${c.trade_name})` : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Referência / obra" htmlFor="title" error={err("title")} className="lg:col-span-2">
          <Input id="title" name="title" defaultValue={values.title} placeholder="Ex.: Residência — box do banheiro social" />
        </FormField>
        <FormField label="Emissão" htmlFor="issue_date" required error={err("issue_date")}>
          <Input id="issue_date" name="issue_date" type="date" defaultValue={values.issue_date} required />
        </FormField>
        <FormField label="Válido até" htmlFor="valid_until" error={err("valid_until")}>
          <Input id="valid_until" name="valid_until" type="date" defaultValue={values.valid_until} />
        </FormField>
        <FormField
          label="Margem líquida desejada (%)"
          htmlFor="target_margin_percent"
          required
          error={err("target_margin_percent")}
          hint="Lucro líquido sobre o preço de venda."
        >
          <Input id="target_margin_percent" name="target_margin_percent" inputMode="decimal" defaultValue={values.target_margin_percent} required />
        </FormField>
        <FormField
          label="Desconto (%)"
          htmlFor="discount_percent"
          error={err("discount_percent")}
          hint={`Seu limite: ${maxDiscountPercent.replace(".", ",")}%.`}
        >
          <Input id="discount_percent" name="discount_percent" inputMode="decimal" defaultValue={values.discount_percent} />
        </FormField>
        <FormField label="Frete de entrega (R$)" htmlFor="freight_amount" error={err("freight_amount")}>
          <Input id="freight_amount" name="freight_amount" inputMode="decimal" defaultValue={values.freight_amount} />
        </FormField>
        <FormField label="Outros custos específicos (R$)" htmlFor="other_costs_amount" error={err("other_costs_amount")}>
          <Input id="other_costs_amount" name="other_costs_amount" inputMode="decimal" defaultValue={values.other_costs_amount} />
        </FormField>
        <FormField label="Descrição dos outros custos" htmlFor="other_costs_description" error={err("other_costs_description")} className="lg:col-span-2">
          <Input id="other_costs_description" name="other_costs_description" defaultValue={values.other_costs_description} placeholder="Ex.: andaime, caçamba, estacionamento" />
        </FormField>
        <FormField label="Condições de pagamento" htmlFor="payment_terms" error={err("payment_terms")} className="sm:col-span-2">
          <Textarea id="payment_terms" name="payment_terms" defaultValue={values.payment_terms} rows={2} />
        </FormField>
        <FormField label="Prazo e condições de entrega" htmlFor="delivery_terms" error={err("delivery_terms")} className="sm:col-span-2">
          <Textarea id="delivery_terms" name="delivery_terms" defaultValue={values.delivery_terms} rows={2} />
        </FormField>
        <FormField label="Observações para o cliente (proposta)" htmlFor="customer_notes" error={err("customer_notes")} className="sm:col-span-2">
          <Textarea id="customer_notes" name="customer_notes" defaultValue={values.customer_notes} rows={2} />
        </FormField>
        <FormField label="Observações internas" htmlFor="internal_notes" error={err("internal_notes")} className="sm:col-span-2">
          <Textarea id="internal_notes" name="internal_notes" defaultValue={values.internal_notes} rows={2} />
        </FormField>
      </fieldset>
      <div className="flex flex-col gap-3 sm:col-span-full">
        <FormMessage state={state} />
        {readOnly ? null : (
          <div>
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
