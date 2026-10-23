import "server-only";

import { AuthorizationError } from "@/server/auth";
import { RepositoryError } from "@/server/repositories/util";

import type { ActionState } from "./actions";

/**
 * Executa o corpo de uma Server Action convertendo erros esperados
 * (autorização, banco) em ActionState. Erros de redirect/notFound do Next
 * são relançados.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof RepositoryError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
