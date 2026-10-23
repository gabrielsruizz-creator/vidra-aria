import type { Metadata } from "next";
import Link from "next/link";

import { SimpleForm } from "@/components/forms/simple-form";
import { ActiveBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OVERHEAD_METHOD_LABELS } from "@/domain/settings/schemas";
import { formatCurrency, formatPercent, toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { unwrap } from "@/server/repositories/util";

import { saveOverheadRate } from "../actions";

export const metadata: Metadata = { title: "Custos indiretos" };

export default async function OverheadRatesPage({ searchParams }: PageProps<"/configuracoes/custos-indiretos">) {
  const user = await requireMember();
  const { editar } = await searchParams;
  const db = await createClient();
  const rates = unwrap(await db.from("overhead_rates").select("*").order("name"));
  const editing = rates.find((r) => r.id === editar);
  const manager = isManager(user);
  return (
    <>
      <PageHeader
        title="Custos indiretos"
        description="Rateio de despesas fixas e de fabricação. Todas as taxas ativas são aplicadas a cada item."
      />
      {manager ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.name}` : "Nova taxa de rateio"}</CardTitle>
            <CardDescription>
              Ex.: aluguel, energia, administração. Use % sobre materiais + mão de obra, ou R$ por hora de mão de obra
              direta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleForm
              key={editing?.id ?? "novo"}
              action={saveOverheadRate.bind(null, editing?.id ?? null)}
              resetOnSuccess={!editing}
              columns={4}
              values={{
                name: editing?.name ?? "",
                method: editing?.method ?? "",
                rate: editing ? toInputDecimal(String(editing.rate)) : "",
                notes: editing?.notes ?? "",
                active: editing?.active ?? true,
              }}
              fields={[
                { kind: "text", name: "name", label: "Nome", required: true },
                {
                  kind: "select",
                  name: "method",
                  label: "Método",
                  required: true,
                  options: Object.entries(OVERHEAD_METHOD_LABELS).map(([value, label]) => ({ value, label })),
                },
                { kind: "decimal", name: "rate", label: "Taxa (% ou R$/h)", required: true },
                { kind: "checkbox", name: "active", label: "Ativa" },
                { kind: "textarea", name: "notes", label: "Observações / base de cálculo", wide: true },
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
                <TableHead>Nome</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{OVERHEAD_METHOD_LABELS[r.method]}</TableCell>
                  <TableCell className="tabular text-right">
                    {r.method === "percentual_custo_direto" ? formatPercent(String(r.rate)) : `${formatCurrency(String(r.rate))}/h`}
                  </TableCell>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
