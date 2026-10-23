import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PriceHistoryTable } from "@/components/catalog/price-history-table";
import { FreshnessBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { offerFreshness } from "@/domain/pricing/offers";
import { toInputDecimal, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listMaterialOptions } from "@/server/repositories/materials";
import { getOffer, listPriceHistory } from "@/server/repositories/offers";
import { getSettings, listUnits } from "@/server/repositories/reference";
import { listSupplierOptions } from "@/server/repositories/suppliers";

import { saveOffer } from "../actions";
import { OfferForm } from "../offer-form";

export const metadata: Metadata = { title: "Oferta" };

export default async function OfferPage({ params }: PageProps<"/precos/[id]">) {
  const user = await requireMember();
  const { id } = await params;
  const db = await createClient();
  const offer = await getOffer(db, id).catch(() => null);
  if (!offer) notFound();
  const [suppliers, materials, units, history, settings] = await Promise.all([
    listSupplierOptions(db),
    listMaterialOptions(db),
    listUnits(db),
    listPriceHistory(db, { offerId: id }),
    getSettings(db),
  ]);
  // Garante que fornecedor/material inativos continuem aparecendo na edição.
  if (!suppliers.some((s) => s.id === offer.supplierId)) {
    suppliers.push({ id: offer.supplierId, legal_name: offer.supplierName, trade_name: null });
  }
  if (!materials.some((m) => m.id === offer.materialId)) {
    materials.push({
      id: offer.materialId,
      internal_code: offer.materialCode,
      description: offer.materialDescription,
      consumption_unit_code: offer.consumptionUnitCode,
      purchase_unit_code: offer.purchaseUnitCode,
      conversion_factor: Number(offer.packageQuantity),
    });
  }
  const fresh = offerFreshness(offer, todayISO(), settings.priceStaleAfterDays);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {offer.materialCode} · {offer.supplierName} <FreshnessBadge status={fresh.status} />
          </span>
        }
        description={
          <>
            {offer.materialDescription} ·{" "}
            <Link className="underline" href={`/materiais/${offer.materialId}`}>
              ver material
            </Link>
          </>
        }
      />
      <div className="grid gap-6">
        <Card>
          <CardContent>
            <OfferForm
              action={saveOffer.bind(null, id)}
              suppliers={suppliers}
              materials={materials}
              units={units}
              isEdit
              readOnly={!isManager(user)}
              values={{
                supplier_id: offer.supplierId,
                material_id: offer.materialId,
                supplier_item_code: offer.supplierItemCode ?? "",
                purchase_unit_code: offer.purchaseUnitCode,
                package_quantity: toInputDecimal(offer.packageQuantity),
                price: toInputDecimal(offer.price),
                discount_percent: toInputDecimal(offer.discountPercent),
                purchase_tax_percent: toInputDecimal(offer.purchaseTaxPercent),
                freight_per_unit: toInputDecimal(offer.freightPerUnit),
                minimum_order_quantity: toInputDecimal(offer.minimumOrderQuantity),
                quoted_at: offer.quotedAt,
                valid_until: offer.validUntil ?? "",
                is_preferred: offer.isPreferred,
                active: offer.active,
                notes: offer.notes ?? "",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico desta oferta</CardTitle>
            <CardDescription>
              Orçamentos já calculados guardam sua própria fotografia de custos e não mudam com estas alterações.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <PriceHistoryTable rows={history} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
