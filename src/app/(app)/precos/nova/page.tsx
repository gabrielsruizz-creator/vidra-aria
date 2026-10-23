import type { Metadata } from "next";

import { NoPermission } from "@/components/shared/no-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { toInputDecimal, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listMaterialOptions } from "@/server/repositories/materials";
import { listUnits } from "@/server/repositories/reference";
import { listSupplierOptions } from "@/server/repositories/suppliers";

import { saveOffer } from "../actions";
import { OfferForm } from "../offer-form";

export const metadata: Metadata = { title: "Nova oferta" };

export default async function NewOfferPage({ searchParams }: PageProps<"/precos/nova">) {
  const user = await requireMember();
  if (!isManager(user)) return <NoPermission />;
  const sp = await searchParams;
  const db = await createClient();
  const [suppliers, materials, units] = await Promise.all([
    listSupplierOptions(db),
    listMaterialOptions(db),
    listUnits(db),
  ]);
  const materialId = typeof sp.material === "string" ? sp.material : "";
  const material = materials.find((m) => m.id === materialId);
  return (
    <>
      <PageHeader title="Nova oferta de fornecedor" description="Cada alteração de preço fica registrada no histórico." />
      <Card>
        <CardContent>
          <OfferForm
            action={saveOffer.bind(null, null)}
            suppliers={suppliers}
            materials={materials}
            units={units}
            values={{
              supplier_id: typeof sp.fornecedor === "string" ? sp.fornecedor : "",
              material_id: material?.id ?? "",
              supplier_item_code: "",
              purchase_unit_code: material?.purchase_unit_code ?? "",
              package_quantity: material ? toInputDecimal(String(material.conversion_factor)) : "",
              price: "",
              discount_percent: "0",
              purchase_tax_percent: "0",
              freight_per_unit: "",
              minimum_order_quantity: "",
              quoted_at: todayISO(),
              valid_until: "",
              is_preferred: false,
              active: true,
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
