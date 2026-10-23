import "server-only";

import type { z } from "zod";

/** Estado padrão retornado por Server Actions usadas com useActionState. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { ok: false };

export function validationError(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: "Revise os campos destacados.", fieldErrors };
}

/** Traduz erros do PostgREST/Postgres para mensagens ao usuário. */
export function databaseError(error: { code?: string; message: string } | null | undefined): ActionState {
  return { ok: false, message: describeDatabaseError(error) };
}

export function describeDatabaseError(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "Erro inesperado.";
  switch (error.code) {
    case "23505":
      return "Já existe um registro com estes dados (código, documento ou nome duplicado).";
    case "23503":
      return "Registro vinculado a outros dados: não pode ser removido ou a referência é inválida.";
    case "42501":
      return /limite autorizado|imutáveis/.test(error.message)
        ? error.message
        : "Você não tem permissão para esta operação.";
    case "23514":
      return error.message.startsWith("new row for relation")
        ? "Dados inválidos: verifique os valores informados."
        : error.message;
    case "40001":
    case "P0002":
      // Mensagens de negócio escritas em português nas migrações.
      return error.message;
    default:
      return error.message.startsWith("new row violates row-level security")
        ? "Você não tem permissão para esta operação."
        : `Não foi possível salvar: ${error.message}`;
  }
}
