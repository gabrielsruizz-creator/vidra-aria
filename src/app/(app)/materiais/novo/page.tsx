import type { Metadata } from "next";

import { NoPermission } from "@/components/shared/no-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listMaterialCategories, listProductLines, listUnits } from "@/server/repositories/reference";

import { saveMaterial } from "../actions";
import { MaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Novo material" };

export default async function NewMaterialPage() {
  const user = await requireMember();
  if (!isManager(user)) return <NoPermission />;
  const db = await createClient();
  const [categories, lines, units] = await Promise.all([
    listMaterialCategories(db),
    listProductLines(db),
    listUnits(db),
  ]);
  return (
    <>
      <PageHeader title="Novo material" />
      <Card>
        <CardContent>
          <MaterialForm
            action={saveMaterial.bind(null, null)}
            categories={categories}
            lines={lines}
            units={units}
            values={{
              internal_code: "",
              description: "",
              category_id: "",
              product_line_id: "",
              purchase_unit_code: "",
              consumption_unit_code: "",
              conversion_factor: "1",
              commercial_length_mm: "",
              notes: "",
              active: true,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
