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
import { formatDocument } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { listCustomers } from "@/server/repositories/customers";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = sp.status === "inativos" || sp.status === "todos" ? sp.status : "ativos";
  const db = await createClient();
  const customers = await listCustomers(db, { q, status });
  return (
    <>
      <PageHeader
        title="Clientes"
        actions={
          <Button asChild>
            <Link href="/clientes/novo">
              <Plus /> Novo cliente
            </Link>
          </Button>
        }
      />
      <SearchBar q={q} placeholder="Nome, e-mail, CPF ou CNPJ">
        <NativeSelect name="status" defaultValue={status} className="sm:w-36" aria-label="Situação">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </NativeSelect>
      </SearchBar>
      {customers.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.trade_name ? <p className="text-xs text-muted-foreground">{c.trade_name}</p> : null}
                    </TableCell>
                    <TableCell>{formatDocument(c.document)}</TableCell>
                    <TableCell>
                      {c.phone ?? "—"}
                      {c.email ? <p className="text-xs text-muted-foreground">{c.email}</p> : null}
                    </TableCell>
                    <TableCell>{c.address_city ? `${c.address_city}${c.address_state ? `/${c.address_state}` : ""}` : "—"}</TableCell>
                    <TableCell>
                      <ActiveBadge active={c.active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
