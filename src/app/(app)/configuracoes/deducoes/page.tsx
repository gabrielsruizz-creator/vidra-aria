import type { Metadata } from "next";
import Link from "next/link";

import { SimpleForm } from "@/components/forms/simple-form";
import { ActiveBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SALE_DEDUCTION_KIND_LABELS } from "@/domain/settings/schemas";
import { dec, sum } from "@/domain/shared/decimal";
import { formatPercent, toInputDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { unwrap } from "@/server/repositories/util";

import { saveSaleDeduction } from "../actions";

export const metadata: Metadata = { title: "Tributos e comissões" };

export default async function SaleDeductionsPage({ searchParams }: PageProps<"/configuracoes/deducoes">) {
  const user = await requireMember();
  const { editar } = await searchParams;
  const db = await createClient();
  const rates = unwrap(await db.from("sale_deduction_rates").select("*").order("name"));
  const editing = rates.find((r) => r.id === editar);
  const manager = isManager(user);
  const total = sum(rates.filter((r) => r.active).map((r) => dec(String(r.percent))));
  return (
    <>
      <PageHeader
        title="Tributos e comissões sobre a venda"
        description={`Percentuais aplicados sobre o preço de venda. Total ativo: ${formatPercent(total)}.`}
      />
      {manager ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.name}` : "Nova dedução"}</CardTitle>
            <CardDescription>
              Informe as alíquotas efetivas conforme o regime tributário da empresa (confirme com a contabilidade).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleForm
              key={editing?.id ?? "novo"}
              action={saveSaleDeduction.bind(null, editing?.id ?? null)}
              resetOnSuccess={!editing}
              columns={4}
              values={{
                name: editing?.name ?? "",
                kind: editing?.kind ?? "",
                percent: editing ? toInputDecimal(String(editing.percent)) : "",
                notes: editing?.notes ?? "",
                active: editing?.active ?? true,
              }}
              fields={[
                { kind: "text", name: "name", label: "Nome", required: true },
                {
                  kind: "select",
                  name: "kind",
                  label: "Tipo",
                  required: true,
                  options: Object.entries(SALE_DEDUCTION_KIND_LABELS).map(([value, label]) => ({ value, label })),
                },
                { kind: "decimal", name: "percent", label: "Percentual (%)", required: true },
                { kind: "checkbox", name: "active", label: "Ativa" },
                { kind: "textarea", name: "notes", label: "Observações", wide: true },
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
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Percentual</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{SALE_DEDUCTION_KIND_LABELS[r.kind]}</TableCell>
                  <TableCell className="tabular text-right">{formatPercent(String(r.percent))}</TableCell>
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
                    Nenhuma dedução cadastrada.
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
