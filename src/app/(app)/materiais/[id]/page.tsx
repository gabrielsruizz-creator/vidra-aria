import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { OffersTable } from "@/components/catalog/offers-table";
import { PriceHistoryTable } from "@/components/catalog/price-history-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toInputDecimal, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { getMaterial } from "@/server/repositories/materials";
import { listOffers, listPriceHistory } from "@/server/repositories/offers";
import { getSettings, listMaterialCategories, listProductLines, listUnits } from "@/server/repositories/reference";
import { unwrap } from "@/server/repositories/util";

import { saveMaterial } from "../actions";
import { MaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Material" };

export default async function MaterialPage({ params }: PageProps<"/materiais/[id]">) {
  const user = await requireMember();
  const { id } = await params;
  const db = await createClient();
  const material = await getMaterial(db, id).catch(() => null);
  if (!material) notFound();

  const [categories, lines, units, offers, history, settings, usage] = await Promise.all([
    listMaterialCategories(db),
    listProductLines(db),
    listUnits(db),
    listOffers(db, { materialIds: [id] }),
    listPriceHistory(db, { materialId: id }),
    getSettings(db),
    db.from("product_components").select("id", { count: "exact", head: true }).eq("material_id", id),
  ]);
  unwrap({ data: true, error: usage.error });
  const manager = isManager(user);

  return (
    <>
      <PageHeader
        title={`${material.internal_code} · ${material.description}`}
        description={`${material.category?.name ?? ""}${material.product_line ? ` · Linha ${material.product_line.name}` : ""}`}
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialForm
              action={saveMaterial.bind(null, id)}
              categories={categories}
              lines={lines}
              units={units}
              readOnly={!manager}
              consumptionUnitLocked={(usage.count ?? 0) > 0}
              values={{
                internal_code: material.internal_code,
                description: material.description,
                category_id: material.category_id,
                product_line_id: material.product_line_id ?? "",
                purchase_unit_code: material.purchase_unit_code,
                consumption_unit_code: material.consumption_unit_code,
                conversion_factor: toInputDecimal(String(material.conversion_factor)),
                commercial_length_mm: material.commercial_length_mm ? String(material.commercial_length_mm) : "",
                notes: material.notes ?? "",
                active: material.active,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ofertas de fornecedores</CardTitle>
            <CardDescription>
              Um material pode ter vários fornecedores. O custeio usa a oferta preferencial vigente ou, na falta dela, a
              de menor custo por {material.consumption_unit_code}.
            </CardDescription>
            {manager ? (
              <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <Button asChild size="sm">
                  <Link href={`/precos/nova?material=${id}`}>
                    <Plus /> Nova oferta
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="px-0">
            {offers.length ? (
              <OffersTable
                offers={offers}
                today={todayISO()}
                staleAfterDays={settings.priceStaleAfterDays}
                show={["supplier"]}
              />
            ) : (
              <div className="px-5">
                <EmptyState title="Nenhuma oferta cadastrada" description="Sem oferta, o material não pode ser custeado." />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de preços</CardTitle>
            <CardDescription>Registro imutável de cada preço informado para este material.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {history.length ? (
              <PriceHistoryTable rows={history} />
            ) : (
              <p className="px-5 text-sm text-muted-foreground">Sem registros.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
