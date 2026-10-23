import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActiveBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCnpj } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listSuppliers } from "@/server/repositories/suppliers";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage({ searchParams }: PageProps<"/fornecedores">) {
  const user = await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = sp.status === "inativos" || sp.status === "todos" ? sp.status : "ativos";
  const db = await createClient();
  const suppliers = await listSuppliers(db, { q, status });

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores, contatos e condições comerciais."
        actions={
          isManager(user) ? (
            <Button asChild>
              <Link href="/fornecedores/novo">
                <Plus /> Novo fornecedor
              </Link>
            </Button>
          ) : null
        }
      />
      <SearchBar q={q} placeholder="Razão social, nome fantasia ou CNPJ">
        <NativeSelect name="status" defaultValue={status} className="sm:w-36" aria-label="Situação">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </NativeSelect>
      </SearchBar>
      {suppliers.length === 0 ? (
        <EmptyState title="Nenhum fornecedor encontrado" />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato principal</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ofertas</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => {
                  const contact = s.contacts.find((c) => c.is_primary) ?? s.contacts[0];
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/fornecedores/${s.id}`} className="font-medium hover:underline">
                          {s.trade_name || s.legal_name}
                        </Link>
                        {s.trade_name ? <p className="text-xs text-muted-foreground">{s.legal_name}</p> : null}
                      </TableCell>
                      <TableCell>{formatCnpj(s.cnpj)}</TableCell>
                      <TableCell>
                        {contact ? (
                          <>
                            {contact.name}
                            <p className="text-xs text-muted-foreground">{contact.phone ?? contact.email}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{s.payment_terms ?? "—"}</TableCell>
                      <TableCell className="tabular text-right">{s.offers[0]?.count ?? 0}</TableCell>
                      <TableCell>
                        <ActiveBadge active={s.active} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
