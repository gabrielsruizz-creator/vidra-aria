"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updatePassword } from "./actions";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, { ok: false });
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription>Use ao menos 10 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <FormField label="Nova senha" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
            </FormField>
            <FormField label="Confirme a senha" htmlFor="confirm">
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            </FormField>
            <FormMessage state={state} />
            <SubmitButton>Salvar senha</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
