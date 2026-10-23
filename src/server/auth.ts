import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "gestor" | "vendedor";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  active: boolean;
  maxDiscountPercent: string;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  vendedor: "Vendedor",
};

/**
 * Lê e valida a sessão (getClaims verifica a assinatura do JWT) e carrega o
 * perfil. Memoizado por requisição.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, max_discount_percent")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    active: profile.active,
    maxDiscountPercent: String(profile.max_discount_percent),
  };
});

/** Exige usuário autenticado e ativo; redireciona caso contrário. */
export async function requireMember(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/acesso-pendente");
  return user;
}

export function isManager(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "admin" || user.role === "gestor";
}

export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para esta operação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Para Server Actions: exige um dos papéis informados. */
export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireMember();
  if (!roles.includes(user.role)) throw new AuthorizationError();
  return user;
}
