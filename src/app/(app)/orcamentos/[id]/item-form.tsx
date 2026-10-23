"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionState } from "@/server/actions";

export function AddItemForm({
  action,
  products,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  products: { id: string; code: string; name: string; requiresDimensions: boolean; publishedVersionNumber: number }[];
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [productId, setProductId] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const product = products.find((p) => p.id === productId);
  const needsDims = product?.requiresDimensions ?? true;
  const err = (k: string) => state.fieldErrors?.[k];

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto com ficha técnica publicada.</p>;
  }

  return (
    <form ref={ref} action={formAction} onReset={() => setProductId("")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <FormField label="Produto" htmlFor="item-product" required error={err("product_id")} className="lg:col-span-2">
        <NativeSelect id="item-product" name="product_id" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Selecione…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name} (ficha v{p.publishedVersionNumber})
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Largura (mm)" htmlFor="item-w" required={needsDims} error={err("width_mm")}>
        <Input id="item-w" name="width_mm" inputMode="numeric" disabled={!needsDims} required={needsDims} />
      </FormField>
      <FormField label="Altura (mm)" htmlFor="item-h" required={needsDims} error={err("height_mm")}>
        <Input id="item-h" name="height_mm" inputMode="numeric" disabled={!needsDims} required={needsDims} />
      </FormField>
      <FormField label="Quantidade" htmlFor="item-q" required error={err("quantity")}>
        <Input id="item-q" name="quantity" inputMode="decimal" defaultValue="1" required />
      </FormField>
      <label className="flex items-end gap-2 pb-2 text-sm">
        <input type="checkbox" name="include_installation" className="size-4 accent-primary" />
        Incluir instalação
      </label>
      <FormField label="Descrição na proposta" htmlFor="item-desc" error={err("description")} className="lg:col-span-2">
        <Input id="item-desc" name="description" placeholder="Ex.: janela da sala, vidro incolor 8 mm" />
      </FormField>
      <FormField label="Custo específico do item (R$)" htmlFor="item-extra" error={err("extra_cost")} hint="Valor total da linha.">
        <Input id="item-extra" name="extra_cost" inputMode="decimal" />
      </FormField>
      <FormField label="Descrição do custo específico" htmlFor="item-extra-desc" error={err("extra_cost_description")} className="lg:col-span-2">
        <Input id="item-extra-desc" name="extra_cost_description" placeholder="Ex.: içamento com guindaste" />
      </FormField>
      <div className="flex items-end">
        <SubmitButton variant="secondary">Adicionar item</SubmitButton>
      </div>
      <div className="sm:col-span-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
