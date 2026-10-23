import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ActiveBadge, FreshnessBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { selectOffer } from "@/domain/pricing/offers";
import { formatCurrency, formatQuantity, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listMaterials } from "@/server/repositories/materials";
import { listOffers } from "@/server/repositories/offers";
import { getSettings, listMaterialCategories } from "@/server/repositories/reference";

export const metadata: Metadata = { title: "Materiais" };

export default async function MaterialsPage({ searchParams }: PageProps<"/materiais">) {
  const user = await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const categoryId = typeof sp.categoria === "string" ? sp.categoria : "";
  const status = sp.status === "inativos" || sp.status === "todos" ? sp.status : "ativos";

  const db = await createClient();
  const [materials, categories, settings] = await Promise.all([
    listMaterials(db, { q, categoryId: categoryId || undefined, status }),
    listMaterialCategories(db),
    getSettings(db),
  ]);
  const offers = materials.length ? await listOffers(db, { materialIds: materials.map((m) => m.id), activeOnly: true }) : [];
  const today = todayISO();

  return (
    <>
      <PageHeader
        title="Materiais"
        description="Perfis, vidros, ferragens e demais insumos com unidades de compra e consumo."
        actions={
          isManager(user) ? (
            <Button asChild>
              <Link href="/materiais/novo">
                <Plus /> Novo material
              </Link>
            </Button>
          ) : null
        }
      />
      <SearchBar q={q} placeholder="Código ou descrição">
        <NativeSelect name="categoria" defaultValue={categoryId} className="sm:w-52" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} className="sm:w-36" aria-label="Situação">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </NativeSelect>
      </SearchBar>
      {materials.length === 0 ? (
        <EmptyState
          title="Nenhum material encontrado"
          description="Cadastre os materiais usados nas fichas técnicas. Os preços ficam nas ofertas dos fornecedores."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Linha</TableHead>
                  <TableHead>Compra → consumo</TableHead>
                  <TableHead className="text-right">Custo/un consumo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => {
                  const sel = selectOffer(
                    offers.filter((o) => o.materialId === m.id),
                    { today, staleAfterDays: settings.priceStaleAfterDays },
                  );
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link href={`/materiais/${m.id}`} className="font-medium hover:underline">
                          {m.internal_code}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-80 truncate whitespace-normal">{m.description}</TableCell>
                      <TableCell>{m.category?.name}</TableCell>
                      <TableCell>{m.product_line?.name ?? <span className="text-muted-foreground">Geral</span>}</TableCell>
                      <TableCell className="text-xs">
                        1 {m.purchase_unit_code} = {formatQuantity(String(m.conversion_factor), 6)} {m.consumption_unit_code}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {sel ? (
                          <>
                            {formatCurrency(sel.unitCost, 4)}
                            <span className="text-xs text-muted-foreground">/{m.consumption_unit_code}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {sel ? <FreshnessBadge status={sel.freshness} /> : <Badge variant="destructive">Sem preço</Badge>}
                      </TableCell>
                      <TableCell>
                        <ActiveBadge active={m.active} />
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
