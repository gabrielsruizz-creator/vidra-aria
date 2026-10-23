"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions";

export type SimpleField =
  | {
      kind: "text" | "decimal" | "integer" | "date" | "email";
      name: string;
      label: string;
      required?: boolean;
      hint?: string;
      placeholder?: string;
      wide?: boolean;
    }
  | { kind: "textarea"; name: string; label: string; hint?: string; wide?: boolean; required?: boolean }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[]; required?: boolean; hint?: string; wide?: boolean }
  | { kind: "checkbox"; name: string; label: string; hint?: string; wide?: boolean; required?: boolean };

/**
 * Formulário declarativo para cadastros simples (taxas, parâmetros).
 * Valores numéricos são texto no padrão brasileiro; a validação é no servidor.
 */
export function SimpleForm({
  action,
  fields,
  values,
  submitLabel = "Salvar",
  resetOnSuccess,
  readOnly,
  columns = 3,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: SimpleField[];
  values: Record<string, string | boolean>;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  readOnly?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];

  return (
    <form ref={ref} action={formAction} className={cn("grid gap-4", grid)}>
      <fieldset disabled={readOnly} className="contents">
        {fields.map((f) => {
          const error = state.fieldErrors?.[f.name];
          const wide = f.wide ? "sm:col-span-full" : undefined;
          if (f.kind === "checkbox") {
            return (
              <label key={f.name} className={cn("flex items-center gap-2 self-end pb-2 text-sm", wide)}>
                <input type="checkbox" name={f.name} defaultChecked={Boolean(values[f.name])} className="size-4 accent-primary" />
                {f.label}
              </label>
            );
          }
          const value = String(values[f.name] ?? "");
          return (
            <FormField key={f.name} label={f.label} htmlFor={f.name} error={error} hint={f.hint} required={f.required} className={wide}>
              {f.kind === "textarea" ? (
                <Textarea id={f.name} name={f.name} defaultValue={value} rows={3} />
              ) : f.kind === "select" ? (
                <NativeSelect id={f.name} name={f.name} defaultValue={value} required={f.required}>
                  <option value="">Selecione…</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  id={f.name}
                  name={f.name}
                  defaultValue={value}
                  required={f.required}
                  placeholder={f.placeholder}
                  type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : "text"}
                  inputMode={f.kind === "decimal" ? "decimal" : f.kind === "integer" ? "numeric" : undefined}
                />
              )}
            </FormField>
          );
        })}
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
