import type { Metadata } from "next";
import Link from "next/link";

import { SimpleForm } from "@/components/forms/simple-form";
import { ActiveBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { unwrap } from "@/server/repositories/util";

import { saveLaborRate } from "../actions";

export const metadata: Metadata = { title: "Mão de obra" };

export default async function LaborRatesPage({ searchParams }: PageProps<"/configuracoes/mao-de-obra">) {
  const user = await requireMember();
  const { editar } = await searchParams;
  const db = await createClient();
  const rates = unwrap(await db.from("labor_rates").select("*").order("name"));
  const editing = rates.find((r) => r.id === editar);
  const manager = isManager(user);
  return (
    <>
      <PageHeader title="Mão de obra direta" description="Custo por hora (com encargos) usado nas operações das fichas técnicas." />
      {manager ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.name}` : "Nova função / taxa"}</CardTitle>
            <CardDescription>Orçamentos já calculados mantêm o custo/hora da época.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleForm
              key={editing?.id ?? "novo"}
              action={saveLaborRate.bind(null, editing?.id ?? null)}
              resetOnSuccess={!editing}
              values={{
                name: editing?.name ?? "",
                description: editing?.description ?? "",
                hourly_cost: editing ? toInputDecimal(String(editing.hourly_cost)) : "",
                active: editing?.active ?? true,
              }}
              fields={[
                { kind: "text", name: "name", label: "Função / setor", required: true, placeholder: "Ex.: Serralheria" },
                { kind: "decimal", name: "hourly_cost", label: "Custo por hora (R$)", required: true },
                { kind: "checkbox", name: "active", label: "Ativa" },
                { kind: "textarea", name: "description", label: "Como o custo foi apurado", wide: true },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Custo/hora</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.name}
                    {r.description ? <p className="text-xs text-muted-foreground">{r.description}</p> : null}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(String(r.hourly_cost), 2)}</TableCell>
                  <TableCell>
                    <ActiveBadge active={r.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    {manager ? (
                      <Link href={`?editar=${r.id}`} className="text-sm text-primary hover:underline">
                        Editar
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma taxa cadastrada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
