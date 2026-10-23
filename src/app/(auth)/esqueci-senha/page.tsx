"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, { ok: false });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Enviaremos um link para o seu e-mail.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <FormField label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </FormField>
          <FormMessage state={state} />
          <SubmitButton pendingLabel="Enviando…">Enviar link</SubmitButton>
          <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Voltar ao login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
