import type { Metadata } from "next";

import { NoPermission } from "@/components/shared/no-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listProductCategories, listProductLines } from "@/server/repositories/reference";

import { saveProduct } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  const user = await requireMember();
  if (!isManager(user)) return <NoPermission />;
  const db = await createClient();
  const [categories, lines] = await Promise.all([listProductCategories(db), listProductLines(db)]);
  return (
    <>
      <PageHeader title="Novo produto" description="Depois de salvar, crie a ficha técnica (versão 1)." />
      <Card>
        <CardContent>
          <ProductForm
            action={saveProduct.bind(null, null)}
            categories={categories}
            lines={lines}
            values={{ code: "", name: "", category_id: "", product_line_id: "", description: "", requires_dimensions: true, is_custom_size: true, active: true }}
          />
        </CardContent>
      </Card>
    </>
  );
}
