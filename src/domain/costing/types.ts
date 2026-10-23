import type { Decimal, DecimalInput } from "@/domain/shared/decimal";
import type { OfferFreshness } from "@/domain/pricing/offers";
import type { UnitInfo } from "@/domain/units/units";

export type QuantityBasis = "fixa" | "largura" | "altura" | "perimetro" | "area";
export type LaborStage = "fabricacao" | "instalacao";
export type OverheadMethod = "percentual_custo_direto" | "valor_por_hora_mo";
export type SaleDeductionKind = "tributo" | "comissao" | "taxa_financeira" | "outro";

export const QUANTITY_BASIS_LABELS: Record<QuantityBasis, string> = {
  fixa: "Fixa por produto",
  largura: "Por largura",
  altura: "Por altura",
  perimetro: "Por perímetro",
  area: "Por área",
};

export type ComponentSpec = {
  id: string;
  position: number;
  materialId: string;
  description: string | null;
  quantityBasis: QuantityBasis;
  /** Multiplicador (peças) ou quantidade fixa na unidade de consumo. */
  coefficient: DecimalInput;
  /** Ajuste somado à medida-base (bases lineares), em mm. */
  offsetMm: DecimalInput;
  wastePercent: DecimalInput;
};

export type LaborOperationSpec = {
  id: string;
  position: number;
  laborRateId: string;
  stage: LaborStage;
  description: string;
  /** Base de tempo: fixa (por produto), por metro (largura/altura/perímetro) ou por m². */
  timeBasis: QuantityBasis;
  minutes: DecimalInput;
};

export type ProductVersionSpec = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  versionNumber: number;
  requiresDimensions: boolean;
  minWidthMm: number | null;
  maxWidthMm: number | null;
  minHeightMm: number | null;
  maxHeightMm: number | null;
  components: ComponentSpec[];
  laborOperations: LaborOperationSpec[];
};

/** Material com a oferta escolhida para custeio (ou null se não houver). */
export type MaterialCostInfo = {
  materialId: string;
  code: string;
  description: string;
  consumptionUnit: UnitInfo;
  offer: {
    id: string;
    supplierId: string;
    supplierName: string;
    purchaseUnitCode: string;
    /** Unidades de consumo por unidade de compra. */
    packageQuantity: DecimalInput;
    /** Custo efetivo de 1 unidade de compra. */
    purchaseUnitCost: DecimalInput;
    /** Custo por unidade de consumo. */
    unitCost: DecimalInput;
    quotedAt: string;
    validUntil: string | null;
    freshness: OfferFreshness;
  } | null;
  /** Avisos sobre o preço (vencido, desatualizado, frete desconhecido). */
  warnings: string[];
};

export type LaborRateInfo = { id: string; name: string; hourlyCost: DecimalInput };
export type OverheadRateInfo = { id: string; name: string; method: OverheadMethod; rate: DecimalInput };
export type SaleDeductionInfo = { id: string; name: string; kind: SaleDeductionKind; percent: DecimalInput };

export type QuoteItemInput = {
  quoteItemId: string;
  position: number;
  description: string | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: DecimalInput;
  includeInstallation: boolean;
  /** Custo específico do item, valor total da linha (R$). */
  extraCost: DecimalInput;
  version: ProductVersionSpec;
};

export type QuoteParameters = {
  /** Lucro líquido desejado, em % do preço de venda. */
  targetMarginPercent: DecimalInput;
  discountPercent: DecimalInput;
  /** Frete de entrega do orçamento (R$), rateado pelos itens. */
  freightAmount: DecimalInput;
  /** Outros custos específicos do orçamento (R$), rateados pelos itens. */
  otherCostsAmount: DecimalInput;
};

export type CostingInput = {
  items: QuoteItemInput[];
  materials: Record<string, MaterialCostInfo>;
  laborRates: Record<string, LaborRateInfo>;
  overheadRates: OverheadRateInfo[];
  saleDeductions: SaleDeductionInfo[];
  parameters: QuoteParameters;
};

export type CostLineType =
  | "material"
  | "mao_de_obra"
  | "instalacao"
  | "custo_indireto"
  | "frete"
  | "outro_custo"
  | "deducao_venda";

export type CostLine = {
  itemPosition: number | null;
  lineType: CostLineType;
  description: string;
  materialId?: string;
  materialCode?: string;
  supplierId?: string;
  supplierName?: string;
  offerId?: string;
  laborRateId?: string;
  overheadRateId?: string;
  saleDeductionRateId?: string;
  productComponentId?: string;
  quantityBasis?: QuantityBasis;
  unitCode?: string;
  quantityNet?: Decimal;
  wastePercent?: Decimal;
  quantityGross?: Decimal;
  unitCost?: Decimal;
  /** % (rateios/deduções) ou R$/h (mão de obra). */
  rate?: Decimal;
  amount: Decimal;
  priceQuotedAt?: string;
  priceValidUntil?: string | null;
};

export type ItemResult = {
  quoteItemId: string;
  position: number;
  version: ProductVersionSpec;
  description: string | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: Decimal;
  areaM2: Decimal | null;
  perimeterM: Decimal | null;
  includeInstallation: boolean;
  materialCost: Decimal;
  laborCost: Decimal;
  laborHours: Decimal;
  installationCost: Decimal;
  extraCost: Decimal;
  allocatedFreight: Decimal;
  allocatedOtherCost: Decimal;
  overheadCost: Decimal;
  /** Custos variáveis/diretos (sem rateio de indiretos). */
  variableCost: Decimal;
  totalCost: Decimal;
  unitCost: Decimal;
  /** Preço recomendado unitário (arredondado a centavos). */
  unitListPrice: Decimal;
  totalListPrice: Decimal;
};

export type PurchaseNeed = {
  materialId: string;
  materialCode: string;
  materialDescription: string;
  consumptionUnitCode: string;
  grossConsumption: Decimal;
  offerId: string;
  supplierId: string;
  supplierName: string;
  purchaseUnitCode: string;
  unitsPerPurchase: Decimal;
  purchaseQuantity: Decimal;
  purchaseUnitCost: Decimal;
  purchaseCost: Decimal;
  leftoverQuantity: Decimal;
};

export type CostingTotals = {
  materialCost: Decimal;
  laborCost: Decimal;
  installationCost: Decimal;
  itemExtraCost: Decimal;
  freightCost: Decimal;
  otherCost: Decimal;
  overheadCost: Decimal;
  variableCost: Decimal;
  totalCost: Decimal;
  purchaseNeedCost: Decimal;
  saleDeductionsPercent: Decimal;
  /** Preço recomendado (antes do desconto). */
  listPrice: Decimal;
  discountAmount: Decimal;
  finalPrice: Decimal;
  saleDeductionsAmount: Decimal;
  contributionMargin: Decimal;
  contributionMarginPercent: Decimal;
  netProfit: Decimal;
  netMarginPercent: Decimal;
  /** Preço com lucro zero (cobre custos totais e deduções). */
  breakEvenPrice: Decimal;
};

export type CostingSuccess = {
  ok: true;
  engineVersion: string;
  items: ItemResult[];
  lines: CostLine[];
  purchaseNeeds: PurchaseNeed[];
  totals: CostingTotals;
  warnings: string[];
};

export type CostingFailure = { ok: false; engineVersion: string; errors: string[]; warnings: string[] };

export type CostingResult = CostingSuccess | CostingFailure;
