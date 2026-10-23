"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormField label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <FormField label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
      <Link href="/esqueci-senha" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Esqueci minha senha
      </Link>
    </form>
  );
}
