import type { Metadata } from "next";
import Link from "next/link";
import { History, Plus } from "lucide-react";

import { OffersTable } from "@/components/catalog/offers-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { offerFreshness } from "@/domain/pricing/offers";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listOffers } from "@/server/repositories/offers";
import { getSettings } from "@/server/repositories/reference";

export const metadata: Metadata = { title: "Preços de fornecedores" };

const SITUATIONS = ["todas", "vigente", "desatualizada", "vencida", "inativa"] as const;

export default async function PricesPage({ searchParams }: PageProps<"/precos">) {
  const user = await requireMember();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacao = SITUATIONS.find((s) => s === sp.situacao) ?? "todas";
  const db = await createClient();
  const [offers, settings] = await Promise.all([listOffers(db, { q }), getSettings(db)]);
  const today = todayISO();
  const filtered = offers.filter((o) => {
    if (situacao === "todas") return true;
    if (situacao === "inativa") return !o.active;
    return o.active && offerFreshness(o, today, settings.priceStaleAfterDays).status === situacao;
  });

  return (
    <>
      <PageHeader
        title="Preços de fornecedores"
        description={`Ofertas por material. Preços com cotação há mais de ${settings.priceStaleAfterDays} dias são considerados desatualizados.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/precos/historico">
                <History /> Histórico
              </Link>
            </Button>
            {isManager(user) ? (
              <Button asChild>
                <Link href="/precos/nova">
                  <Plus /> Nova oferta
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <SearchBar q={q} placeholder="Material ou fornecedor">
        <NativeSelect name="situacao" defaultValue={situacao} className="sm:w-44" aria-label="Situação">
          <option value="todas">Todas as situações</option>
          <option value="vigente">Vigentes</option>
          <option value="desatualizada">Desatualizadas</option>
          <option value="vencida">Vencidas</option>
          <option value="inativa">Inativas</option>
        </NativeSelect>
      </SearchBar>
      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma oferta encontrada" />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <OffersTable offers={filtered} today={today} staleAfterDays={settings.priceStaleAfterDays} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
