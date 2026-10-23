"use client";

import { Calculator } from "lucide-react";
import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { CalculationState } from "../actions";

export function CalculateButton({ action }: { action: (prev: CalculationState) => Promise<CalculationState> }) {
  const [state, formAction] = useActionState(action, { ok: false });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <SubmitButton pendingLabel="Calculando…">
          <Calculator /> Calcular e salvar fotografia
        </SubmitButton>
      </div>
      <FormMessage state={state} />
      {state.errors?.length ? (
        <Alert variant="destructive">
          <AlertTitle>Corrija antes de calcular</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
