import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPlus, FilePlus2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { getProduct, listProductVersions } from "@/server/repositories/products";
import { listProductCategories, listProductLines } from "@/server/repositories/reference";

import { createDraft, saveProduct } from "../actions";
import { ProductForm } from "../product-form";
import { VersionStatusBadge } from "./version-status-badge";

export const metadata: Metadata = { title: "Produto" };

export default async function ProductPage({ params, searchParams }: PageProps<"/produtos/[id]">) {
  const user = await requireMember();
  const { id } = await params;
  const { erro } = await searchParams;
  const db = await createClient();
  const product = await getProduct(db, id).catch(() => null);
  if (!product) notFound();
  const [versions, categories, lines] = await Promise.all([
    listProductVersions(db, id),
    listProductCategories(db),
    listProductLines(db),
  ]);
  const manager = isManager(user);
  const hasDraft = versions.some((v) => v.status === "rascunho");
  const published = versions.find((v) => v.status === "publicada");

  return (
    <>
      <PageHeader title={`${product.code} · ${product.name}`} description={product.category?.name} />
      {typeof erro === "string" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fichas técnicas</CardTitle>
            <CardDescription>
              Orçamentos usam a versão publicada. Para alterar uma ficha publicada, crie um rascunho a partir dela.
            </CardDescription>
            {manager && !hasDraft ? (
              <div className="col-start-2 row-span-2 row-start-1 flex gap-2 self-start justify-self-end">
                <form action={createDraft.bind(null, id, published?.id ?? null)}>
                  <Button size="sm" type="submit">
                    {published ? <CopyPlus /> : <FilePlus2 />}
                    {published ? `Nova versão a partir da v${published.version_number}` : "Criar ficha (v1)"}
                  </Button>
                </form>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="px-0">
            {versions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Componentes</TableHead>
                    <TableHead className="text-right">Operações</TableHead>
                    <TableHead>Publicada em</TableHead>
                    <TableHead>Resumo da alteração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link href={`/produtos/${id}/versoes/${v.id}`} className="font-medium hover:underline">
                          v{v.version_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <VersionStatusBadge status={v.status} />
                      </TableCell>
                      <TableCell className="tabular text-right">{v.components[0]?.count ?? 0}</TableCell>
                      <TableCell className="tabular text-right">{v.operations[0]?.count ?? 0}</TableCell>
                      <TableCell>{formatDateTime(v.published_at)}</TableCell>
                      <TableCell className="max-w-72 truncate">{v.change_summary ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 text-sm text-muted-foreground">
                Nenhuma ficha ainda. <Badge variant="warning">O produto não pode ser orçado</Badge>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dados do produto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              action={saveProduct.bind(null, id)}
              categories={categories}
              lines={lines}
              readOnly={!manager}
              values={{
                code: product.code,
                name: product.name,
                category_id: product.category_id,
                product_line_id: product.product_line_id ?? "",
                description: product.description ?? "",
                requires_dimensions: product.requires_dimensions,
                is_custom_size: product.is_custom_size,
                active: product.active,
              }}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              <Link href="/produtos" className="underline">
                Voltar à lista
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
