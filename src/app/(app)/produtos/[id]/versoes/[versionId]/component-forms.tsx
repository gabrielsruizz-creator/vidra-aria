"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { QUANTITY_BASIS_LABELS, type QuantityBasis } from "@/domain/costing/types";
import type { ActionState } from "@/server/actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function useResettingAction(action: Action) {
  const [state, formAction] = useActionState(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return { state, formAction, ref };
}

const LINEAR: QuantityBasis[] = ["largura", "altura", "perimetro"];

export function ComponentForm({
  action,
  materials,
  requiresDimensions,
}: {
  action: Action;
  materials: { id: string; internal_code: string; description: string; consumption_unit_code: string; dimension: string }[];
  requiresDimensions: boolean;
}) {
  const { state, formAction, ref } = useResettingAction(action);
  const [basis, setBasis] = useState<QuantityBasis>("fixa");
  const [materialId, setMaterialId] = useState("");
  const material = materials.find((m) => m.id === materialId);
  const err = (k: string) => state.fieldErrors?.[k];
  const bases = (Object.keys(QUANTITY_BASIS_LABELS) as QuantityBasis[]).filter((b) => requiresDimensions || b === "fixa");

  const coefficientHint =
    basis === "fixa"
      ? `Quantidade por produto${material ? ` em ${material.consumption_unit_code}` : ""}.`
      : basis === "area"
        ? "Multiplicador da área (ex.: 1 folha = 1)."
        : "Número de peças / multiplicador da medida.";

  return (
    <form
      ref={ref}
      action={formAction}
      onReset={() => {
        setBasis("fixa");
        setMaterialId("");
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
    >
      <FormField label="Material" htmlFor="cmp-material" required error={err("material_id")} className="lg:col-span-2">
        <NativeSelect id="cmp-material" name="material_id" value={materialId} onChange={(e) => setMaterialId(e.target.value)} required>
          <option value="">Selecione…</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.internal_code} — {m.description} ({m.consumption_unit_code})
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Base de cálculo" htmlFor="cmp-basis" required error={err("quantity_basis")}>
        <NativeSelect id="cmp-basis" name="quantity_basis" value={basis} onChange={(e) => setBasis(e.target.value as QuantityBasis)}>
          {bases.map((b) => (
            <option key={b} value={b}>
              {QUANTITY_BASIS_LABELS[b]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Coeficiente" htmlFor="cmp-coef" required error={err("coefficient")} hint={coefficientHint}>
        <Input id="cmp-coef" name="coefficient" inputMode="decimal" defaultValue="1" required />
      </FormField>
      <FormField
        label="Ajuste (mm)"
        htmlFor="cmp-offset"
        error={err("offset_mm")}
        hint={LINEAR.includes(basis) ? "Somado à medida (pode ser negativo)." : "Só para bases lineares."}
      >
        <Input id="cmp-offset" name="offset_mm" inputMode="decimal" defaultValue="0" readOnly={!LINEAR.includes(basis)} key={basis} />
      </FormField>
      <FormField label="Perda (%)" htmlFor="cmp-waste" error={err("waste_percent")}>
        <Input id="cmp-waste" name="waste_percent" inputMode="decimal" defaultValue="0" />
      </FormField>
      <FormField label="Função na peça" htmlFor="cmp-desc" error={err("description")} className="lg:col-span-3">
        <Input id="cmp-desc" name="description" placeholder="Ex.: montante lateral, folha fixa" />
      </FormField>
      <FormField label="Ordem" htmlFor="cmp-pos" error={err("position")}>
        <Input id="cmp-pos" name="position" inputMode="numeric" placeholder="0" />
      </FormField>
      <div className="flex items-end lg:col-span-2">
        <SubmitButton variant="secondary">Adicionar componente</SubmitButton>
      </div>
      <div className="sm:col-span-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function OperationForm({
  action,
  laborRates,
  requiresDimensions,
}: {
  action: Action;
  laborRates: { id: string; name: string }[];
  requiresDimensions: boolean;
}) {
  const { state, formAction, ref } = useResettingAction(action);
  const err = (k: string) => state.fieldErrors?.[k];
  const bases = (Object.keys(QUANTITY_BASIS_LABELS) as QuantityBasis[]).filter((b) => requiresDimensions || b === "fixa");
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <FormField label="Descrição" htmlFor="op-desc" required error={err("description")} className="lg:col-span-2">
        <Input id="op-desc" name="description" required placeholder="Ex.: corte e montagem" />
      </FormField>
      <FormField label="Etapa" htmlFor="op-stage" required error={err("stage")}>
        <NativeSelect id="op-stage" name="stage" defaultValue="fabricacao">
          <option value="fabricacao">Fabricação</option>
          <option value="instalacao">Instalação</option>
        </NativeSelect>
      </FormField>
      <FormField label="Função / taxa" htmlFor="op-rate" required error={err("labor_rate_id")}>
        <NativeSelect id="op-rate" name="labor_rate_id" required defaultValue="">
          <option value="">Selecione…</option>
          {laborRates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Base de tempo" htmlFor="op-basis" required error={err("time_basis")}>
        <NativeSelect id="op-basis" name="time_basis" defaultValue="fixa">
          {bases.map((b) => (
            <option key={b} value={b}>
              {QUANTITY_BASIS_LABELS[b]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Minutos" htmlFor="op-min" required error={err("minutes")} hint="Por produto, por metro ou por m², conforme a base.">
        <Input id="op-min" name="minutes" inputMode="decimal" required />
      </FormField>
      <FormField label="Ordem" htmlFor="op-pos" error={err("position")}>
        <Input id="op-pos" name="position" inputMode="numeric" placeholder="0" />
      </FormField>
      <div className="flex items-end">
        <SubmitButton variant="secondary">Adicionar operação</SubmitButton>
      </div>
      <div className="sm:col-span-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PublishForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <FormField label="Resumo da alteração" htmlFor="change_summary" className="flex-1">
        <Input id="change_summary" name="change_summary" placeholder="Ex.: inclusão da escova de vedação" />
      </FormField>
      <SubmitButton pendingLabel="Publicando…">Publicar versão</SubmitButton>
      <div className="sm:basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
