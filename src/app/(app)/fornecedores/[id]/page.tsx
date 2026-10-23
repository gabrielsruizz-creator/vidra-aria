import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { OffersTable } from "@/components/catalog/offers-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCnpj, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { listOffers } from "@/server/repositories/offers";
import { getSettings } from "@/server/repositories/reference";
import { getSupplier, listSupplierContacts } from "@/server/repositories/suppliers";

import { addSupplierContact, removeSupplierContact, saveSupplier } from "../actions";
import { ContactForm } from "../contact-form";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Fornecedor" };

export default async function SupplierPage({ params }: PageProps<"/fornecedores/[id]">) {
  const user = await requireMember();
  const { id } = await params;
  const db = await createClient();
  const supplier = await getSupplier(db, id).catch(() => null);
  if (!supplier) notFound();
  const [contacts, offers, settings] = await Promise.all([
    listSupplierContacts(db, id),
    listOffers(db, { supplierId: id }),
    getSettings(db),
  ]);
  const manager = isManager(user);

  return (
    <>
      <PageHeader
        title={supplier.trade_name || supplier.legal_name}
        description={supplier.cnpj ? `CNPJ ${formatCnpj(supplier.cnpj)}` : supplier.legal_name}
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierForm
              action={saveSupplier.bind(null, id)}
              readOnly={!manager}
              values={{
                legal_name: supplier.legal_name,
                trade_name: supplier.trade_name ?? "",
                cnpj: supplier.cnpj ? formatCnpj(supplier.cnpj) : "",
                payment_terms: supplier.payment_terms ?? "",
                notes: supplier.notes ?? "",
                active: supplier.active,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {contacts.length ? (
              <ul className="divide-y rounded-md border">
                {contacts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {c.name} {c.is_primary ? <Badge variant="secondary">Principal</Badge> : null}
                      </p>
                      <p className="text-muted-foreground">
                        {[c.role, c.phone, c.email].filter(Boolean).join(" · ") || "Sem dados de contato"}
                      </p>
                    </div>
                    {manager ? (
                      <form action={removeSupplierContact.bind(null, id, c.id)}>
                        <Button variant="ghost" size="icon" type="submit" aria-label={`Remover ${c.name}`}>
                          <Trash2 />
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            )}
            {manager ? <ContactForm action={addSupplierContact.bind(null, id)} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ofertas deste fornecedor</CardTitle>
            <CardDescription>Preços por material, com histórico preservado a cada alteração.</CardDescription>
            {manager ? (
              <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <Button asChild size="sm">
                  <Link href={`/precos/nova?fornecedor=${id}`}>
                    <Plus /> Nova oferta
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="px-0">
            {offers.length ? (
              <OffersTable offers={offers} today={todayISO()} staleAfterDays={settings.priceStaleAfterDays} show={["material"]} />
            ) : (
              <div className="px-5">
                <EmptyState title="Nenhuma oferta" description="Cadastre os preços praticados por este fornecedor." />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
