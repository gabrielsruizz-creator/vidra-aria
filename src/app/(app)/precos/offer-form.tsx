"use client";

import { useActionState, useMemo, useState } from "react";

import { UnitSelect } from "@/components/catalog/unit-select";
import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { costPerConsumptionUnit, effectivePurchaseUnitCost } from "@/domain/pricing/offers";
import type { UnitInfo } from "@/domain/units/units";
import { formatCurrency, toInputDecimal } from "@/lib/format";
import { tryParseDecimalBR } from "@/lib/parse";
import type { ActionState } from "@/server/actions";

export type OfferFormValues = {
  supplier_id: string;
  material_id: string;
  supplier_item_code: string;
  purchase_unit_code: string;
  package_quantity: string;
  price: string;
  discount_percent: string;
  purchase_tax_percent: string;
  freight_per_unit: string;
  minimum_order_quantity: string;
  quoted_at: string;
  valid_until: string;
  is_preferred: boolean;
  active: boolean;
  notes: string;
};

type MaterialOption = {
  id: string;
  internal_code: string;
  description: string;
  consumption_unit_code: string;
  purchase_unit_code: string;
  conversion_factor: number;
};

export function OfferForm({
  action,
  values,
  suppliers,
  materials,
  units,
  isEdit,
  readOnly,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: OfferFormValues;
  suppliers: { id: string; legal_name: string; trade_name: string | null }[];
  materials: MaterialOption[];
  units: (UnitInfo & { name: string })[];
  isEdit?: boolean;
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [v, setV] = useState(values);
  const set = (k: keyof OfferFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));
  const material = materials.find((m) => m.id === v.material_id);
  const err = (k: string) => state.fieldErrors?.[k];

  function onMaterialChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const m = materials.find((x) => x.id === e.target.value);
    setV((prev) => ({
      ...prev,
      material_id: e.target.value,
      // Sugere a unidade e o fator do cadastro do material.
      purchase_unit_code: m ? m.purchase_unit_code : prev.purchase_unit_code,
      package_quantity: m ? toInputDecimal(String(m.conversion_factor)) : prev.package_quantity,
    }));
  }

  const preview = useMemo(() => {
    const price = tryParseDecimalBR(v.price);
    const qty = tryParseDecimalBR(v.package_quantity);
    const disc = v.discount_percent ? tryParseDecimalBR(v.discount_percent) : "0";
    const tax = v.purchase_tax_percent ? tryParseDecimalBR(v.purchase_tax_percent) : "0";
    const freight = v.freight_per_unit ? tryParseDecimalBR(v.freight_per_unit) : null;
    if (!price || !qty || disc === null || tax === null || Number(qty) <= 0) return null;
    if (v.freight_per_unit && freight === null) return null;
    const o = { price, packageQuantity: qty, discountPercent: disc, purchaseTaxPercent: tax, freightPerUnit: freight };
    try {
      return { effective: effectivePurchaseUnitCost(o), perUnit: costPerConsumptionUnit(o) };
    } catch {
      return null;
    }
  }, [v]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <fieldset disabled={readOnly} className="contents">
        <FormField label="Fornecedor" htmlFor="supplier_id" required error={err("supplier_id")} className="lg:col-span-2">
          <NativeSelect id="supplier_id" name="supplier_id" value={v.supplier_id} onChange={set("supplier_id")} disabled={isEdit} required>
            <option value="">Selecione…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.trade_name || s.legal_name}
              </option>
            ))}
          </NativeSelect>
          {isEdit ? <input type="hidden" name="supplier_id" value={v.supplier_id} /> : null}
        </FormField>
        <FormField label="Material" htmlFor="material_id" required error={err("material_id")} className="lg:col-span-2">
          <NativeSelect id="material_id" name="material_id" value={v.material_id} onChange={onMaterialChange} disabled={isEdit} required>
            <option value="">Selecione…</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.internal_code} — {m.description}
              </option>
            ))}
          </NativeSelect>
          {isEdit ? <input type="hidden" name="material_id" value={v.material_id} /> : null}
        </FormField>
        <FormField label="Código no fornecedor" htmlFor="supplier_item_code" error={err("supplier_item_code")}>
          <Input id="supplier_item_code" name="supplier_item_code" value={v.supplier_item_code} onChange={set("supplier_item_code")} />
        </FormField>
        <FormField label="Unidade de compra" htmlFor="purchase_unit_code" required error={err("purchase_unit_code")}>
          <UnitSelect
            id="purchase_unit_code"
            name="purchase_unit_code"
            units={units}
            value={v.purchase_unit_code}
            onChange={set("purchase_unit_code")}
            required
          />
        </FormField>
        <FormField
          label={`Qtd. por unidade de compra${material ? ` (${material.consumption_unit_code})` : ""}`}
          htmlFor="package_quantity"
          required
          error={err("package_quantity")}
          hint="Na unidade de consumo do material. Ex.: caixa com 100 → 100."
        >
          <Input id="package_quantity" name="package_quantity" inputMode="decimal" value={v.package_quantity} onChange={set("package_quantity")} required />
        </FormField>
        <FormField label="Preço por unidade de compra (R$)" htmlFor="price" required error={err("price")}>
          <Input id="price" name="price" inputMode="decimal" value={v.price} onChange={set("price")} required placeholder="0,00" />
        </FormField>
        <FormField label="Desconto (%)" htmlFor="discount_percent" error={err("discount_percent")}>
          <Input id="discount_percent" name="discount_percent" inputMode="decimal" value={v.discount_percent} onChange={set("discount_percent")} />
        </FormField>
        <FormField
          label="Tributos não recuperáveis (%)"
          htmlFor="purchase_tax_percent"
          error={err("purchase_tax_percent")}
          hint="Ex.: IPI, ST ou DIFAL que viram custo."
        >
          <Input id="purchase_tax_percent" name="purchase_tax_percent" inputMode="decimal" value={v.purchase_tax_percent} onChange={set("purchase_tax_percent")} />
        </FormField>
        <FormField label="Frete por unidade de compra (R$)" htmlFor="freight_per_unit" error={err("freight_per_unit")} hint="Deixe vazio se não for conhecido.">
          <Input id="freight_per_unit" name="freight_per_unit" inputMode="decimal" value={v.freight_per_unit} onChange={set("freight_per_unit")} />
        </FormField>
        <FormField label="Pedido mínimo" htmlFor="minimum_order_quantity" error={err("minimum_order_quantity")} hint="Em unidades de compra. Opcional.">
          <Input id="minimum_order_quantity" name="minimum_order_quantity" inputMode="decimal" value={v.minimum_order_quantity} onChange={set("minimum_order_quantity")} />
        </FormField>
        <FormField label="Data da cotação" htmlFor="quoted_at" required error={err("quoted_at")}>
          <Input id="quoted_at" name="quoted_at" type="date" value={v.quoted_at} onChange={set("quoted_at")} required />
        </FormField>
        <FormField label="Válido até" htmlFor="valid_until" error={err("valid_until")}>
          <Input id="valid_until" name="valid_until" type="date" value={v.valid_until} onChange={set("valid_until")} />
        </FormField>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_preferred" defaultChecked={values.is_preferred} className="size-4 accent-primary" />
            Oferta preferencial
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={values.active} className="size-4 accent-primary" />
            Oferta ativa
          </label>
        </div>
        <FormField label="Observações" htmlFor="notes" error={err("notes")} className="sm:col-span-2 lg:col-span-4">
          <Textarea id="notes" name="notes" defaultValue={values.notes} rows={2} />
        </FormField>
      </fieldset>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm sm:col-span-2 lg:col-span-4">
        <p className="mb-1 font-medium">Prévia do custo</p>
        {preview ? (
          <p className="tabular">
            Custo efetivo por {v.purchase_unit_code || "unidade de compra"}:{" "}
            <strong>{formatCurrency(preview.effective, 4)}</strong> · por {material?.consumption_unit_code ?? "unidade de consumo"}:{" "}
            <strong>{formatCurrency(preview.perUnit, 4)}</strong>
          </p>
        ) : (
          <p className="text-muted-foreground">Preencha preço e quantidade para ver o custo efetivo.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Fórmula: preço × (1 − desconto) × (1 + tributos não recuperáveis) + frete, dividido pela quantidade por unidade de compra.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        {readOnly ? null : (
          <div>
            <SubmitButton>Salvar oferta</SubmitButton>
          </div>
        )}
      </div>
    </form>
  );
}
