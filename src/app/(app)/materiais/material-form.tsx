"use client";

import { useActionState } from "react";

import { UnitSelect } from "@/components/catalog/unit-select";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { UnitInfo } from "@/domain/units/units";
import type { ActionState } from "@/server/actions";

export type MaterialFormValues = {
  internal_code: string;
  description: string;
  category_id: string;
  product_line_id: string;
  purchase_unit_code: string;
  consumption_unit_code: string;
  conversion_factor: string;
  commercial_length_mm: string;
  notes: string;
  active: boolean;
};

export function MaterialForm({
  action,
  values,
  categories,
  lines,
  units,
  readOnly,
  consumptionUnitLocked,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: MaterialFormValues;
  categories: { id: string; name: string }[];
  lines: { id: string; name: string }[];
  units: (UnitInfo & { name: string })[];
  readOnly?: boolean;
  consumptionUnitLocked?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <fieldset disabled={readOnly} className="contents">
        <FormField label="Código interno" htmlFor="internal_code" required error={err("internal_code")}>
          <Input id="internal_code" name="internal_code" defaultValue={values.internal_code} maxLength={40} required />
        </FormField>
        <FormField label="Categoria" htmlFor="category_id" required error={err("category_id")}>
          <NativeSelect id="category_id" name="category_id" defaultValue={values.category_id} required>
            <option value="">Selecione…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Descrição" htmlFor="description" required error={err("description")} className="sm:col-span-2">
          <Input id="description" name="description" defaultValue={values.description} maxLength={200} required />
        </FormField>
        <FormField
          label="Linha de aplicação"
          htmlFor="product_line_id"
          error={err("product_line_id")}
          hint="Deixe em branco para materiais de uso geral."
        >
          <NativeSelect id="product_line_id" name="product_line_id" defaultValue={values.product_line_id}>
            <option value="">Uso geral</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          label="Comprimento comercial (mm)"
          htmlFor="commercial_length_mm"
          error={err("commercial_length_mm")}
          hint="Ex.: barra de perfil. Opcional."
        >
          <Input
            id="commercial_length_mm"
            name="commercial_length_mm"
            inputMode="numeric"
            defaultValue={values.commercial_length_mm}
          />
        </FormField>
        <FormField label="Unidade de compra" htmlFor="purchase_unit_code" required error={err("purchase_unit_code")}>
          <UnitSelect id="purchase_unit_code" name="purchase_unit_code" units={units} defaultValue={values.purchase_unit_code} required />
        </FormField>
        <FormField
          label="Unidade de consumo"
          htmlFor="consumption_unit_code"
          required
          error={err("consumption_unit_code")}
          hint={consumptionUnitLocked ? "Usado em fichas técnicas: a unidade de consumo não pode mudar." : "Unidade usada nas fichas técnicas."}
        >
          <UnitSelect
            id="consumption_unit_code"
            name="consumption_unit_code"
            units={units}
            defaultValue={values.consumption_unit_code}
            required
            disabled={consumptionUnitLocked}
          />
          {consumptionUnitLocked ? (
            <input type="hidden" name="consumption_unit_code" value={values.consumption_unit_code} />
          ) : null}
        </FormField>
        <FormField
          label="Fator de conversão"
          htmlFor="conversion_factor"
          required
          error={err("conversion_factor")}
          hint="Unidades de consumo em 1 unidade de compra (ex.: barra de 6 m → 6)."
        >
          <Input id="conversion_factor" name="conversion_factor" inputMode="decimal" defaultValue={values.conversion_factor} required />
        </FormField>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={values.active} className="size-4 accent-primary" />
            Material ativo
          </label>
        </div>
        <FormField label="Observações" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
          <Textarea id="notes" name="notes" defaultValue={values.notes} rows={3} />
        </FormField>
      </fieldset>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        {readOnly ? null : (
          <div>
            <SubmitButton>Salvar material</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
