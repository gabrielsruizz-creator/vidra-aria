import type { Metadata } from "next";

import { PriceHistoryTable } from "@/components/catalog/price-history-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/server/auth";
import { listPriceHistory } from "@/server/repositories/offers";

export const metadata: Metadata = { title: "Histórico de preços" };

export default async function PriceHistoryPage() {
  await requireMember();
  const db = await createClient();
  const rows = await listPriceHistory(db, {}, 300);
  return (
    <>
      <PageHeader title="Histórico de preços" description="Últimos 300 registros de criação e alteração de preços (imutável)." />
      {rows.length ? (
        <Card className="py-0">
          <CardContent className="px-0">
            <PriceHistoryTable rows={rows} showMaterial />
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="Nenhum preço registrado ainda" />
      )}
    </>
  );
}
