import "server-only";

import { describeDatabaseError } from "@/server/actions";

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

type DbError = { code?: string; message: string };

/** Extrai `data` de uma resposta do Supabase ou lança erro descritivo. */
export function unwrap<T>(result: { data: T; error: DbError | null }): NonNullable<T> {
  if (result.error) throw new RepositoryError(describeDatabaseError(result.error), result.error.code);
  if (result.data === null || result.data === undefined) throw new RepositoryError("Registro não encontrado.");
  return result.data as NonNullable<T>;
}

/** Como `unwrap`, mas aceita ausência de registro (maybeSingle). */
export function unwrapMaybe<T>(result: { data: T; error: DbError | null }): T {
  if (result.error) throw new RepositoryError(describeDatabaseError(result.error), result.error.code);
  return result.data;
}

/** Escapa curingas para uso em filtros ilike do PostgREST. */
export function ilikePattern(term: string): string {
  const cleaned = term.trim().replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");
  return `%${cleaned}%`;
}

/** Numeric do PostgREST chega como number; converte para string decimal. */
export function num(value: number | string | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}
