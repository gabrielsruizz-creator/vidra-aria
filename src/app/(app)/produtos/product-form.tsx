"use client";

import { SimpleForm } from "@/components/forms/simple-form";
import type { ActionState } from "@/server/actions";

export function ProductForm({
  action,
  values,
  categories,
  lines,
  readOnly,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: Record<string, string | boolean>;
  categories: { id: string; name: string }[];
  lines: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  return (
    <SimpleForm
      action={action}
      readOnly={readOnly}
      submitLabel="Salvar produto"
      values={values}
      fields={[
        { kind: "text", name: "code", label: "Código", required: true },
        { kind: "text", name: "name", label: "Nome comercial", required: true },
        { kind: "select", name: "category_id", label: "Categoria", required: true, options: categories.map((c) => ({ value: c.id, label: c.name })) },
        { kind: "select", name: "product_line_id", label: "Linha", options: lines.map((l) => ({ value: l.id, label: l.name })), hint: "Opcional." },
        { kind: "checkbox", name: "requires_dimensions", label: "Exige largura e altura" },
        { kind: "checkbox", name: "is_custom_size", label: "Fabricado sob medida" },
        { kind: "checkbox", name: "active", label: "Produto ativo" },
        { kind: "textarea", name: "description", label: "Descrição (aparece na proposta)", wide: true },
      ]}
    />
  );
}
