import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActiveBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listProducts } from "@/server/repositories/products";
import { listProductCategories } from "@/server/repositories/reference";

export const metadata: Metadata = { title: "Produtos e fichas técnicas" };

export default async function ProductsPage({ searchParams }: PageProps<"/produtos">) {
  const user = await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const categoryId = typeof sp.categoria === "string" ? sp.categoria : "";
  const db = await createClient();
  const [products, categories] = await Promise.all([
    listProducts(db, { q, categoryId: categoryId || undefined, status: "todos" }),
    listProductCategories(db),
  ]);
  return (
    <>
      <PageHeader
        title="Produtos e fichas técnicas"
        description="Modelos comerciais com fichas versionadas: componentes, regras de dimensionamento, perdas e tempos."
        actions={
          isManager(user) ? (
            <Button asChild>
              <Link href="/produtos/novo">
                <Plus /> Novo produto
              </Link>
            </Button>
          ) : null
        }
      />
      <SearchBar q={q} placeholder="Código ou nome">
        <NativeSelect name="categoria" defaultValue={categoryId} className="sm:w-52" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </SearchBar>
      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre o produto e depois monte a ficha técnica com os componentes validados pela engenharia."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Linha</TableHead>
                  <TableHead>Ficha vigente</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const published = p.versions.find((v) => v.status === "publicada");
                  const draft = p.versions.find((v) => v.status === "rascunho");
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/produtos/${p.id}`} className="font-medium hover:underline">
                          {p.code}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal">{p.name}</TableCell>
                      <TableCell>{p.category?.name}</TableCell>
                      <TableCell>{p.product_line?.name ?? "—"}</TableCell>
                      <TableCell className="space-x-1">
                        {published ? <Badge variant="success">v{published.version_number}</Badge> : <Badge variant="warning">Sem versão publicada</Badge>}
                        {draft ? <Badge variant="secondary">Rascunho v{draft.version_number}</Badge> : null}
                      </TableCell>
                      <TableCell>
                        <ActiveBadge active={p.active} />
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
