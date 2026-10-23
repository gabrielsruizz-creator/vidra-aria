"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/server/actions";

export function InternalNotesForm({
  action,
  value,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  value: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea name="internal_notes" defaultValue={value} rows={3} aria-label="Observações internas" />
      <FormMessage state={state} />
      <div>
        <SubmitButton size="sm" variant="secondary">
          Salvar observações
        </SubmitButton>
      </div>
    </form>
  );
}
