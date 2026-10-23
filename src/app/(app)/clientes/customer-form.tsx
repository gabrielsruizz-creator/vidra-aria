"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions";

export type CustomerFormValues = {
  person_type: "fisica" | "juridica";
  name: string;
  trade_name: string;
  document: string;
  email: string;
  phone: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  notes: string;
  active: boolean;
};

export const EMPTY_CUSTOMER: CustomerFormValues = {
  person_type: "fisica",
  name: "",
  trade_name: "",
  document: "",
  email: "",
  phone: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_district: "",
  address_city: "",
  address_state: "",
  address_postal_code: "",
  notes: "",
  active: true,
};

export function CustomerForm({
  action,
  values,
  returnTo,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: CustomerFormValues;
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const err = (k: string) => state.fieldErrors?.[k];
  const text = (name: keyof CustomerFormValues, label: string, props: React.ComponentProps<"input"> = {}, className?: string) => (
    <FormField label={label} htmlFor={name} error={err(name)} className={className} required={props.required}>
      <Input id={name} name={name} defaultValue={values[name] as string} {...props} />
    </FormField>
  );
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
      <FormField label="Tipo" htmlFor="person_type" required error={err("person_type")}>
        <NativeSelect id="person_type" name="person_type" defaultValue={values.person_type}>
          <option value="fisica">Pessoa física</option>
          <option value="juridica">Pessoa jurídica</option>
        </NativeSelect>
      </FormField>
      {text("name", "Nome / razão social", { required: true, maxLength: 200 }, "lg:col-span-2")}
      {text("document", "CPF / CNPJ", { inputMode: "numeric" })}
      {text("trade_name", "Nome fantasia / apelido", {}, "lg:col-span-2")}
      {text("email", "E-mail", { type: "email" })}
      {text("phone", "Telefone", { inputMode: "tel" })}
      {text("address_postal_code", "CEP", { inputMode: "numeric", placeholder: "00000-000" })}
      {text("address_street", "Logradouro", {}, "lg:col-span-2")}
      {text("address_number", "Número")}
      {text("address_complement", "Complemento")}
      {text("address_district", "Bairro")}
      {text("address_city", "Cidade")}
      {text("address_state", "UF", { maxLength: 2, placeholder: "SP" })}
      <FormField label="Observações" htmlFor="notes" error={err("notes")} className="sm:col-span-2 lg:col-span-4">
        <Textarea id="notes" name="notes" defaultValue={values.notes} rows={2} />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={values.active} className="size-4 accent-primary" />
        Cliente ativo
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        <div>
          <SubmitButton>Salvar cliente</SubmitButton>
        </div>
      </div>
    </form>
  );
}
