import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPlus, Trash2 } from "lucide-react";

import { CostLinesTable } from "@/components/costing/cost-lines-table";
import { SimpleForm } from "@/components/forms/simple-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateQuote } from "@/domain/costing/engine";
import { QUANTITY_BASIS_LABELS } from "@/domain/costing/types";
import { formatCurrency, formatDateTime, formatPercent, formatQuantity, todayISO } from "@/lib/format";
import { tryParseDecimalBR } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";
import { isManager, requireMember } from "@/server/auth";
import { getProductVersion, listVersionComponents, listVersionOperations } from "@/server/repositories/products";
import { getSettings } from "@/server/repositories/reference";
import { unwrap } from "@/server/repositories/util";
import { loadActiveRates, loadMaterialCosts, loadVersionSpecs } from "@/server/services/costing-data";

import { VersionStatusBadge } from "../../version-status-badge";
import {
  addComponent,
  addOperation,
  createDraft,
  deleteDraft,
  publishVersion,
  removeComponent,
  removeOperation,
  saveVersionLimits,
} from "../../../actions";
import { ComponentForm, OperationForm, PublishForm } from "./component-forms";

export const metadata: Metadata = { title: "Ficha técnica" };

export default async function VersionPage({ params, searchParams }: PageProps<"/produtos/[id]/versoes/[versionId]">) {
  const user = await requireMember();
  const { id, versionId } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const version = await getProductVersion(db, versionId).catch(() => null);
  if (!version || version.product_id !== id || !version.product) notFound();

  const [components, operations, settings] = await Promise.all([
    listVersionComponents(db, versionId),
    listVersionOperations(db, versionId),
    getSettings(db),
  ]);
  const manager = isManager(user);
  const editable = manager && version.status === "rascunho";
  const requiresDimensions = version.product.requires_dimensions;
  const product = version.product;

  const [materialOptions, laborRates, otherVersions] = editable
    ? await Promise.all([
        db
          .from("materials")
          .select("id, internal_code, description, consumption_unit_code, unit:units!materials_consumption_unit_code_fkey(dimension)")
          .eq("active", true)
          .order("internal_code"),
        db.from("labor_rates").select("id, name").eq("active", true).order("name"),
        Promise.resolve(null),
      ])
    : [null, null, await db.from("product_versions").select("id").eq("product_id", id).eq("status", "rascunho")];
  const hasDraft = otherVersions ? unwrap(otherVersions).length > 0 : true;

  // Simulador: calcula o custo da ficha com os preços vigentes, sem salvar nada.
  const simWidth = typeof sp.largura === "string" ? Number.parseInt(sp.largura, 10) : NaN;
  const simHeight = typeof sp.altura === "string" ? Number.parseInt(sp.altura, 10) : NaN;
  const simQty = typeof sp.quantidade === "string" ? tryParseDecimalBR(sp.quantidade) : "1";
  const simMargin = typeof sp.margem === "string" ? tryParseDecimalBR(sp.margem) : settings.defaultTargetMarginPercent;
  const simInstall = sp.instalacao === "on";
  const wantsSim = typeof sp.simular === "string";
  let simulation: ReturnType<typeof calculateQuote> | null = null;
  if (wantsSim) {
    const specs = await loadVersionSpecs(db, [versionId]);
    const spec = specs.get(versionId)!;
    const [materials, rates] = await Promise.all([
      loadMaterialCosts(db, spec.components.map((c) => c.materialId), { today: todayISO(), staleAfterDays: settings.priceStaleAfterDays }),
      loadActiveRates(db),
    ]);
    simulation = calculateQuote({
      items: [
        {
          quoteItemId: "simulacao",
          position: 1,
          description: null,
          widthMm: Number.isFinite(simWidth) ? simWidth : null,
          heightMm: Number.isFinite(simHeight) ? simHeight : null,
          quantity: simQty ?? "1",
          includeInstallation: simInstall,
          extraCost: "0",
          version: spec,
        },
      ],
      materials,
      ...rates,
      parameters: { targetMarginPercent: simMargin ?? "0", discountPercent: "0", freightAmount: "0", otherCostsAmount: "0" },
    });
  }

  const base = `/produtos/${id}/versoes/${versionId}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {product.code} · ficha v{version.version_number} <VersionStatusBadge status={version.status} />
          </span>
        }
        description={
          <>
            {product.name} ·{" "}
            <Link href={`/produtos/${id}`} className="underline">
              todas as versões
            </Link>
            {version.published_at ? ` · publicada em ${formatDateTime(version.published_at)}` : null}
          </>
        }
        actions={
          manager && version.status !== "rascunho" && !hasDraft ? (
            <form action={createDraft.bind(null, id, versionId)}>
              <Button type="submit" variant="outline">
                <CopyPlus /> Nova versão a partir desta
              </Button>
            </form>
          ) : editable ? (
            <form action={deleteDraft.bind(null, id, versionId)}>
              <Button type="submit" variant="ghost" className="text-destructive">
                <Trash2 /> Excluir rascunho
              </Button>
            </form>
          ) : null
        }
      />
      {typeof sp.erro === "string" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{sp.erro}</AlertDescription>
        </Alert>
      ) : null}
      {version.status !== "rascunho" ? (
        <Alert className="mb-6">
          <AlertTitle>Versão somente leitura</AlertTitle>
          <AlertDescription>
            Versões publicadas e arquivadas não mudam, para que orçamentos já feitos continuem rastreáveis.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Componentes (materiais)</CardTitle>
            <CardDescription>
              Regras genéricas configuráveis. Não há fórmulas de corte presumidas: informe coeficientes e ajustes validados
              pela engenharia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead className="text-right">Coeficiente</TableHead>
                  <TableHead className="text-right">Ajuste</TableHead>
                  <TableHead className="text-right">Perda</TableHead>
                  {editable ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{c.position}</TableCell>
                    <TableCell>
                      <Link href={`/materiais/${c.material_id}`} className="font-medium hover:underline">
                        {c.material?.internal_code}
                      </Link>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">{c.material?.description}</p>
                    </TableCell>
                    <TableCell>{c.description ?? "—"}</TableCell>
                    <TableCell>{QUANTITY_BASIS_LABELS[c.quantity_basis]}</TableCell>
                    <TableCell className="tabular text-right">
                      {formatQuantity(String(c.coefficient), 6)}
                      {c.quantity_basis === "fixa" ? ` ${c.material?.consumption_unit_code ?? ""}` : "×"}
                    </TableCell>
                    <TableCell className="tabular text-right">{Number(c.offset_mm) ? `${formatQuantity(String(c.offset_mm), 2)} mm` : "—"}</TableCell>
                    <TableCell className="tabular text-right">{formatPercent(String(c.waste_percent))}</TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <form action={removeComponent.bind(null, id, versionId, c.id)}>
                          <Button type="submit" variant="ghost" size="icon" aria-label="Remover componente">
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {components.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum componente.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {editable && materialOptions ? (
              <div className="border-t px-5 pt-5">
                <ComponentForm
                  action={addComponent.bind(null, id, versionId)}
                  requiresDimensions={requiresDimensions}
                  materials={unwrap(materialOptions).map((m) => ({
                    id: m.id,
                    internal_code: m.internal_code,
                    description: m.description,
                    consumption_unit_code: m.consumption_unit_code,
                    dimension: m.unit?.dimension ?? "unidade",
                  }))}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mão de obra (tempos)</CardTitle>
            <CardDescription>Operações de instalação só entram quando o item do orçamento inclui instalação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead className="text-right">Minutos</TableHead>
                  {editable ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-muted-foreground">{o.position}</TableCell>
                    <TableCell>{o.description}</TableCell>
                    <TableCell>{o.stage === "instalacao" ? "Instalação" : "Fabricação"}</TableCell>
                    <TableCell>
                      {o.labor_rate?.name}
                      {o.labor_rate && !o.labor_rate.active ? <span className="text-xs text-destructive"> (inativa)</span> : null}
                    </TableCell>
                    <TableCell>{QUANTITY_BASIS_LABELS[o.time_basis]}</TableCell>
                    <TableCell className="tabular text-right">{formatQuantity(String(o.minutes), 4)}</TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <form action={removeOperation.bind(null, id, versionId, o.id)}>
                          <Button type="submit" variant="ghost" size="icon" aria-label="Remover operação">
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma operação.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {editable && laborRates ? (
              <div className="border-t px-5 pt-5">
                {unwrap(laborRates).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Cadastre funções de mão de obra em{" "}
                    <Link className="underline" href="/configuracoes/mao-de-obra">
                      Configurações › Mão de obra
                    </Link>
                    .
                  </p>
                ) : (
                  <OperationForm
                    action={addOperation.bind(null, id, versionId)}
                    laborRates={unwrap(laborRates)}
                    requiresDimensions={requiresDimensions}
                  />
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limites de medidas</CardTitle>
            <CardDescription>Opcional. Itens fora dos limites não podem ser calculados.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleForm
              action={saveVersionLimits.bind(null, id, versionId)}
              readOnly={!editable}
              columns={4}
              submitLabel="Salvar limites"
              values={{
                min_width_mm: version.min_width_mm ? String(version.min_width_mm) : "",
                max_width_mm: version.max_width_mm ? String(version.max_width_mm) : "",
                min_height_mm: version.min_height_mm ? String(version.min_height_mm) : "",
                max_height_mm: version.max_height_mm ? String(version.max_height_mm) : "",
                notes: version.notes ?? "",
              }}
              fields={[
                { kind: "integer", name: "min_width_mm", label: "Largura mínima (mm)" },
                { kind: "integer", name: "max_width_mm", label: "Largura máxima (mm)" },
                { kind: "integer", name: "min_height_mm", label: "Altura mínima (mm)" },
                { kind: "integer", name: "max_height_mm", label: "Altura máxima (mm)" },
                { kind: "textarea", name: "notes", label: "Notas técnicas da versão", wide: true },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulador de custo</CardTitle>
            <CardDescription>Calcula esta ficha com os preços e taxas vigentes. Nada é salvo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form method="get" action={base} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input type="hidden" name="simular" value="1" />
              {requiresDimensions ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sim-l">Largura (mm)</Label>
                    <Input id="sim-l" name="largura" inputMode="numeric" defaultValue={Number.isFinite(simWidth) ? simWidth : ""} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sim-a">Altura (mm)</Label>
                    <Input id="sim-a" name="altura" inputMode="numeric" defaultValue={Number.isFinite(simHeight) ? simHeight : ""} required />
                  </div>
                </>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sim-q">Quantidade</Label>
                <Input id="sim-q" name="quantidade" inputMode="decimal" defaultValue={typeof sp.quantidade === "string" ? sp.quantidade : "1"} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sim-m">Margem líquida (%)</Label>
                <Input id="sim-m" name="margem" inputMode="decimal" defaultValue={typeof sp.margem === "string" ? sp.margem : (settings.defaultTargetMarginPercent ?? "0").replace(".", ",")} />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="instalacao" defaultChecked={simInstall} className="size-4 accent-primary" />
                Com instalação
              </label>
              <div className="flex items-end">
                <Button type="submit" variant="secondary">
                  Simular
                </Button>
              </div>
            </form>
            {simulation && !simulation.ok ? (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível calcular</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {simulation.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {simulation?.ok ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Materiais (consumo)" value={formatCurrency(simulation.totals.materialCost)} />
                  <StatCard
                    label="Mão de obra + instalação"
                    value={formatCurrency(simulation.totals.laborCost.plus(simulation.totals.installationCost))}
                  />
                  <StatCard label="Custo total" value={formatCurrency(simulation.totals.totalCost)} hint={`Indiretos: ${formatCurrency(simulation.totals.overheadCost)}`} />
                  <StatCard
                    label="Preço recomendado"
                    value={formatCurrency(simulation.totals.listPrice)}
                    hint={`Unitário ${formatCurrency(simulation.items[0].unitListPrice)} · equilíbrio ${formatCurrency(simulation.totals.breakEvenPrice)}`}
                  />
                </div>
                {simulation.warnings.length ? (
                  <Alert variant="warning">
                    <AlertTitle>Avisos</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {simulation.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="-mx-5">
                  <CostLinesTable
                    lines={simulation.lines.map((l, i) => ({
                      key: String(i),
                      lineType: l.lineType,
                      description: l.description,
                      materialCode: l.materialCode,
                      supplierName: l.supplierName,
                      unitCode: l.unitCode,
                      quantityNet: l.quantityNet,
                      wastePercent: l.wastePercent,
                      quantityGross: l.quantityGross,
                      unitCost: l.unitCost,
                      rate: l.rate,
                      amount: l.amount,
                      priceQuotedAt: l.priceQuotedAt,
                    }))}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {editable ? (
          <Card>
            <CardHeader>
              <CardTitle>Publicar</CardTitle>
              <CardDescription>
                Ao publicar, esta versão passa a ser usada em novos itens de orçamento e a versão anterior é arquivada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PublishForm action={publishVersion.bind(null, id, versionId)} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
