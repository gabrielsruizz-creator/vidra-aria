"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions";

export type SupplierFormValues = {
  legal_name: string;
  trade_name: string;
  cnpj: string;
  payment_terms: string;
  notes: string;
  active: boolean;
};

export function SupplierForm({
  action,
  values,
  readOnly,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: SupplierFormValues;
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={readOnly} className="contents">
        <FormField label="Razão social" htmlFor="legal_name" required error={err("legal_name")}>
          <Input id="legal_name" name="legal_name" defaultValue={values.legal_name} required maxLength={200} />
        </FormField>
        <FormField label="Nome fantasia" htmlFor="trade_name" error={err("trade_name")}>
          <Input id="trade_name" name="trade_name" defaultValue={values.trade_name} maxLength={200} />
        </FormField>
        <FormField label="CNPJ" htmlFor="cnpj" error={err("cnpj")} hint="Opcional.">
          <Input id="cnpj" name="cnpj" defaultValue={values.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" />
        </FormField>
        <FormField label="Condições de pagamento" htmlFor="payment_terms" error={err("payment_terms")}>
          <Input id="payment_terms" name="payment_terms" defaultValue={values.payment_terms} placeholder="Ex.: 28/56 dias" />
        </FormField>
        <FormField label="Observações" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
          <Textarea id="notes" name="notes" defaultValue={values.notes} rows={3} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={values.active} className="size-4 accent-primary" />
          Fornecedor ativo
        </label>
      </fieldset>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        {readOnly ? null : (
          <div>
            <SubmitButton>Salvar fornecedor</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
