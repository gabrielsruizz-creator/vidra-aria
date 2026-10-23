import type { Metadata } from "next";

import { SimpleForm } from "@/components/forms/simple-form";
import { NoPermission } from "@/components/shared/no-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember, ROLE_LABELS } from "@/server/auth";
import { unwrap } from "@/server/repositories/util";

import { updateProfile } from "../actions";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const user = await requireMember();
  if (user.role !== "admin") return <NoPermission message="Somente administradores gerenciam usuários." />;
  const db = await createClient();
  const profiles = unwrap(await db.from("profiles").select("*").order("active").order("email"));
  return (
    <>
      <PageHeader
        title="Usuários"
        description="Novos cadastros entram inativos. Convide usuários pelo painel do Supabase (Authentication › Users › Invite) e libere o acesso aqui."
      />
      <div className="grid gap-4">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {p.email}
                <Badge variant={p.active ? "success" : "warning"}>{p.active ? "Ativo" : "Aguardando liberação"}</Badge>
                <Badge variant="outline">{ROLE_LABELS[p.role]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleForm
                action={updateProfile.bind(null, p.id)}
                columns={4}
                submitLabel="Salvar usuário"
                values={{
                  full_name: p.full_name,
                  role: p.role,
                  max_discount_percent: toInputDecimal(String(p.max_discount_percent)),
                  active: p.active,
                }}
                fields={[
                  { kind: "text", name: "full_name", label: "Nome" },
                  {
                    kind: "select",
                    name: "role",
                    label: "Papel",
                    required: true,
                    options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
                  },
                  {
                    kind: "decimal",
                    name: "max_discount_percent",
                    label: "Desconto máximo (%)",
                    required: true,
                    hint: "Administradores não têm limite.",
                  },
                  { kind: "checkbox", name: "active", label: "Acesso liberado" },
                ]}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
