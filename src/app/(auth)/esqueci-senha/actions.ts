"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions";

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.email("Informe um e-mail válido.").safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });
  // Mesma resposta para e-mails existentes ou não (evita enumeração de usuários).
  return { ok: true, message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." };
}
