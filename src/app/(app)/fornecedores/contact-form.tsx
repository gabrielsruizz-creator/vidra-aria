"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/server/actions";

export function ContactForm({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-4">
      <FormField label="Nome" htmlFor="c-name" required error={err("name")}>
        <Input id="c-name" name="name" required />
      </FormField>
      <FormField label="Função" htmlFor="c-role" error={err("role")}>
        <Input id="c-role" name="role" placeholder="Ex.: vendas" />
      </FormField>
      <FormField label="Telefone" htmlFor="c-phone" error={err("phone")}>
        <Input id="c-phone" name="phone" inputMode="tel" />
      </FormField>
      <FormField label="E-mail" htmlFor="c-email" error={err("email")}>
        <Input id="c-email" name="email" type="email" />
      </FormField>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_primary" className="size-4 accent-primary" />
        Contato principal
      </label>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        <SubmitButton size="sm" variant="secondary">
          Adicionar contato
        </SubmitButton>
      </div>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
