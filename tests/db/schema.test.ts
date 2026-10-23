/**
 * Testes de integração do banco (migrações, triggers e RLS).
 * Executados apenas quando TEST_DATABASE_URL está definido: `npm run db:test`.
 */
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { calculateQuote } from "@/domain/costing/engine";
import { toSnapshotPayload } from "@/server/services/quote-calculation";

import { DATABASE_URL, asUser, connect, createUser, expectFailure, lookupId, type TestUser } from "./helpers";

describe.skipIf(!DATABASE_URL)("banco de dados", () => {
  let db: Client;
  let admin: TestUser;
  let gestor: TestUser;
  let vendedor: TestUser;
  let outroVendedor: TestUser;
  let inativo: TestUser;
  let categoryPerfis: string;
  let categoryVidros: string;
  let productCategory: string;

  beforeAll(async () => {
    db = await connect();
    admin = await createUser(db, { role: "admin" });
    gestor = await createUser(db, { role: "gestor", maxDiscount: 10 });
    vendedor = await createUser(db, { role: "vendedor", maxDiscount: 5 });
    outroVendedor = await createUser(db, { role: "vendedor" });
    inativo = await createUser(db, { role: "gestor", active: false });
    categoryPerfis = await lookupId(db, "select id from material_categories where code = 'perfis_aluminio'");
    categoryVidros = await lookupId(db, "select id from material_categories where code = 'vidros'");
    productCategory = await lookupId(db, "select id from product_categories where name = 'Janelas'");
  });

  afterAll(async () => {
    await db?.end();
  });

  async function createMaterial(code: string, unit: "m" | "m2" | "un", category = categoryPerfis) {
    return asUser(db, gestor, async (q) => {
      const { rows } = await q(
        `insert into materials (internal_code, description, category_id, purchase_unit_code, consumption_unit_code, conversion_factor)
         values ($1, $2, $3, $4, $4, 1) returning id`,
        [code, `Material de teste ${code}`, category, unit],
      );
      return rows[0].id as string;
    });
  }

  async function createSupplier(name: string) {
    return asUser(db, gestor, async (q) => {
      const { rows } = await q("insert into suppliers (legal_name) values ($1) returning id", [name]);
      return rows[0].id as string;
    });
  }

  describe("perfis e acesso", () => {
    it("cria perfil inativo automaticamente para novo usuário", async () => {
      const { rows } = await db.query(
        "insert into auth.users (email) values ('novo@teste.local') returning id",
      );
      const profile = await db.query("select role, active from profiles where id = $1", [rows[0].id]);
      expect(profile.rows[0]).toEqual({ role: "vendedor", active: false });
    });

    it("bloqueia acesso anônimo", async () => {
      await expect(asUser(db, null, (q) => q("select * from units"))).rejects.toThrow(/permission denied/);
    });

    it("usuário inativo não enxerga dados", async () => {
      const { rows } = await asUser(db, inativo, (q) => q("select * from units"));
      expect(rows).toHaveLength(0);
    });

    it("membro ativo lê dados de referência", async () => {
      const { rows } = await asUser(db, vendedor, (q) => q("select code from units where code = 'm2'"));
      expect(rows).toHaveLength(1);
    });

    it("vendedor não altera o próprio papel", async () => {
      const result = await asUser(db, vendedor, (q) =>
        q("update profiles set role = 'admin', max_discount_percent = 100 where id = $1", [vendedor.id]),
      );
      expect(result.rowCount).toBe(0);
      const { rows } = await db.query("select role from profiles where id = $1", [vendedor.id]);
      expect(rows[0].role).toBe("vendedor");
    });

    it("vendedor não cadastra materiais, mas cadastra clientes", async () => {
      await asUser(
        db,
        vendedor,
        async (q) => {
          const msg = await expectFailure(
            db,
            `insert into materials (internal_code, description, category_id, purchase_unit_code, consumption_unit_code)
             values ('X1', 'x', $1, 'un', 'un')`,
            [categoryPerfis],
          );
          expect(msg).toMatch(/row-level security/);
          const { rows } = await q("insert into customers (name) values ('Cliente teste') returning created_by");
          expect(rows[0].created_by).toBe(vendedor.id);
        },
        { rollback: true },
      );
    });
  });

  describe("materiais e preços", () => {
    it("exige fator 1 quando unidades de compra e consumo são iguais", async () => {
      await asUser(
        db,
        gestor,
        async () => {
          const msg = await expectFailure(
            db,
            `insert into materials (internal_code, description, category_id, purchase_unit_code, consumption_unit_code, conversion_factor)
             values ('F1', 'x', $1, 'm', 'm', 6)`,
            [categoryPerfis],
          );
          expect(msg).toMatch(/materials_same_unit_factor_chk/);
        },
        { rollback: true },
      );
    });

    it("registra histórico de preços e o mantém imutável", async () => {
      const materialId = await createMaterial("HIST-1", "m");
      const supplierId = await createSupplier("Fornecedor histórico");

      const offerId = await asUser(db, gestor, async (q) => {
        const { rows } = await q(
          `insert into supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity, price)
           values ($1, $2, 'barra', 6, '180.5000') returning id`,
          [supplierId, materialId],
        );
        return rows[0].id as string;
      });

      await asUser(db, gestor, (q) =>
        q("update supplier_material_offers set notes = 'só observação' where id = $1", [offerId]),
      );
      await asUser(db, gestor, (q) =>
        q("update supplier_material_offers set price = '199.9000' where id = $1", [offerId]),
      );

      const { rows } = await db.query(
        "select change_type, price::text, recorded_by from material_price_history where offer_id = $1 order by id",
        [offerId],
      );
      expect(rows).toEqual([
        { change_type: "criacao", price: "180.5000", recorded_by: gestor.id },
        { change_type: "atualizacao", price: "199.9000", recorded_by: gestor.id },
      ]);

      await expect(
        asUser(db, gestor, (q) => q("delete from material_price_history where offer_id = $1", [offerId])),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("update material_price_history set price = 1 where offer_id = $1", [offerId])).rejects.toThrow(
        /imutáveis/,
      );
    });

    it("permite só uma oferta preferencial ativa por material", async () => {
      const materialId = await createMaterial("PREF-1", "un");
      const a = await createSupplier("Fornecedor A");
      const b = await createSupplier("Fornecedor B");
      await asUser(
        db,
        gestor,
        async (q) => {
          await q(
            `insert into supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity, price, is_preferred)
             values ($1, $2, 'un', 1, 10, true)`,
            [a, materialId],
          );
          const msg = await expectFailure(
            db,
            `insert into supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity, price, is_preferred)
             values ($1, $2, 'un', 1, 9, true)`,
            [b, materialId],
          );
          expect(msg).toMatch(/offers_preferred_uidx/);
        },
        { rollback: true },
      );
    });
  });

  describe("fichas técnicas", () => {
    it("impede base linear para material consumido em unidades", async () => {
      const materialId = await createMaterial("UN-1", "un");
      const productId = await asUser(db, gestor, async (q) => {
        const { rows } = await q(
          "insert into products (code, name, category_id) values ('P-UNIT', 'Produto', $1) returning id",
          [productCategory],
        );
        return rows[0].id as string;
      });
      await asUser(
        db,
        gestor,
        async (q) => {
          const { rows } = await q("select public.create_product_version_draft($1) as id", [productId]);
          const msg = await expectFailure(
            db,
            `insert into product_components (product_version_id, material_id, quantity_basis, coefficient)
             values ($1, $2, 'largura', 2)`,
            [rows[0].id, materialId],
          );
          expect(msg).toMatch(/Base linear/);
        },
        { rollback: true },
      );
    });

    it("congela versões publicadas e arquiva a anterior ao publicar nova", async () => {
      const profile = await createMaterial("PERF-V", "m");
      const productId = await asUser(db, gestor, async (q) => {
        const { rows } = await q(
          "insert into products (code, name, category_id) values ('P-VERS', 'Produto versionado', $1) returning id",
          [productCategory],
        );
        return rows[0].id as string;
      });

      const v1 = await asUser(db, gestor, async (q) => {
        const { rows } = await q("select public.create_product_version_draft($1) as id", [productId]);
        await q(
          `insert into product_components (product_version_id, material_id, quantity_basis, coefficient, offset_mm)
           values ($1, $2, 'largura', 2, -10)`,
          [rows[0].id, profile],
        );
        await q("select public.publish_product_version($1, 'Primeira versão')", [rows[0].id]);
        return rows[0].id as string;
      });

      await expect(
        asUser(db, gestor, (q) =>
          q("update product_components set coefficient = 3 where product_version_id = $1", [v1]),
        ),
      ).rejects.toThrow(/crie uma nova versão/);

      const v2 = await asUser(db, gestor, async (q) => {
        const { rows } = await q("select public.create_product_version_draft($1, $2) as id", [productId, v1]);
        await q("update product_components set coefficient = 3 where product_version_id = $1", [rows[0].id]);
        await q("select public.publish_product_version($1)", [rows[0].id]);
        return rows[0].id as string;
      });

      const { rows } = await db.query(
        "select id, version_number, status from product_versions where product_id = $1 order by version_number",
        [productId],
      );
      expect(rows).toEqual([
        { id: v1, version_number: 1, status: "arquivada" },
        { id: v2, version_number: 2, status: "publicada" },
      ]);
      const comp = await db.query(
        "select coefficient::text from product_components where product_version_id = $1",
        [v1],
      );
      expect(comp.rows[0].coefficient).toBe("2.000000");
    });
  });

  describe("orçamentos e fotografias", () => {
    let productId: string;
    let versionId: string;
    let customerId: string;
    let offerId: string;
    let materialId: string;

    beforeAll(async () => {
      materialId = await createMaterial("VID-8", "m2", categoryVidros);
      const supplierId = await createSupplier("Fornecedor vidros");
      offerId = await asUser(db, gestor, async (q) => {
        const { rows } = await q(
          `insert into supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity, price)
           values ($1, $2, 'm2', 1, '150.0000') returning id`,
          [supplierId, materialId],
        );
        return rows[0].id as string;
      });
      productId = await asUser(db, gestor, async (q) => {
        const { rows } = await q(
          "insert into products (code, name, category_id) values ('P-QUOTE', 'Produto orçamento', $1) returning id",
          [productCategory],
        );
        return rows[0].id as string;
      });
      versionId = await asUser(db, gestor, async (q) => {
        const { rows } = await q("select public.create_product_version_draft($1) as id", [productId]);
        await q(
          `insert into product_components (product_version_id, material_id, quantity_basis, coefficient)
           values ($1, $2, 'area', 1)`,
          [rows[0].id, materialId],
        );
        await q("select public.publish_product_version($1)", [rows[0].id]);
        return rows[0].id as string;
      });
      customerId = await asUser(db, vendedor, async (q) => {
        const { rows } = await q("insert into customers (name) values ('Cliente orçamento') returning id");
        return rows[0].id as string;
      });
    });

    function snapshotPayload(quoteItemId: string) {
      const money = {
        material_cost: "150.00", labor_cost: "0.00", installation_cost: "0.00", item_extra_cost: "0.00",
        freight_cost: "0.00", other_cost: "0.00", overhead_cost: "0.00", variable_cost: "150.00",
        total_cost: "150.00", purchase_need_cost: "150.00", list_price: "200.00", discount_amount: "0.00",
        final_price: "200.00", sale_deductions_amount: "0.00", contribution_margin: "50.00",
        contribution_margin_percent: "25.0000", net_profit: "50.00", net_margin_percent: "25.0000",
      };
      return {
        snapshot: {
          engine_version: "teste", target_margin_percent: "25", discount_percent: "0",
          sale_deductions_percent: "0", freight_amount: "0", other_costs_amount: "0",
          warnings: ["aviso de teste"], ...money,
        },
        items: [
          {
            quote_item_id: quoteItemId, position: 1, product_id: productId, product_version_id: versionId,
            product_code: "P-QUOTE", product_name: "Produto orçamento", version_number: 1, width_mm: 1000,
            height_mm: 1000, quantity: "1", area_m2: "1", perimeter_m: "4", include_installation: false,
            material_cost: "150", labor_cost: "0", installation_cost: "0", extra_cost: "0",
            allocated_freight: "0", allocated_other_cost: "0", overhead_cost: "0", total_cost: "150",
            unit_cost: "150", unit_list_price: "200.00", total_list_price: "200.00",
          },
        ],
        lines: [
          {
            item_position: 1, line_type: "material", description: "Vidro", material_id: materialId,
            offer_id: offerId, unit_code: "m2", quantity_net: "1", waste_percent: "0", quantity_gross: "1",
            unit_cost: "150", amount: "150",
          },
        ],
        needs: [
          {
            material_id: materialId, material_code: "VID-8", material_description: "Vidro",
            consumption_unit_code: "m2", gross_consumption: "1", offer_id: offerId, purchase_unit_code: "m2",
            units_per_purchase: "1", purchase_quantity: "1", purchase_unit_cost: "150", purchase_cost: "150",
            leftover_quantity: "0",
          },
        ],
      };
    }

    it("respeita o limite de desconto do usuário", async () => {
      await asUser(
        db,
        vendedor,
        async (q) => {
          const msg = await expectFailure(
            db,
            "insert into quotes (customer_id, target_margin_percent, discount_percent) values ($1, 20, 7.5)",
            [customerId],
          );
          expect(msg).toMatch(/acima do limite autorizado/);
          await q("insert into quotes (customer_id, target_margin_percent, discount_percent) values ($1, 20, 5)", [
            customerId,
          ]);
        },
        { rollback: true },
      );
    });

    it("grava fotografia, bloqueia edição após envio e preserva custos históricos", async () => {
      const { quoteId, itemId } = await asUser(db, vendedor, async (q) => {
        const quote = await q(
          "insert into quotes (customer_id, target_margin_percent) values ($1, 25) returning id",
          [customerId],
        );
        const item = await q(
          `insert into quote_items (quote_id, position, product_id, product_version_id, width_mm, height_mm, quantity)
           values ($1, 1, $2, $3, 1000, 1000, 1) returning id`,
          [quote.rows[0].id, productId, versionId],
        );
        return { quoteId: quote.rows[0].id as string, itemId: item.rows[0].id as string };
      });

      // Outro vendedor não altera orçamento alheio.
      const other = await asUser(db, outroVendedor, (q) =>
        q("update quotes set title = 'invasão' where id = $1", [quoteId]),
      );
      expect(other.rowCount).toBe(0);

      // Não envia sem cálculo.
      await expect(
        asUser(db, vendedor, (q) => q("update quotes set status = 'enviado' where id = $1", [quoteId])),
      ).rejects.toThrow(/Calcule o orçamento/);

      const p = snapshotPayload(itemId);
      const snapshotId = await asUser(db, vendedor, async (q) => {
        const { rows } = await q("select public.save_quote_calculation($1, $2, $3, $4, $5) as id", [
          quoteId,
          JSON.stringify(p.snapshot),
          JSON.stringify(p.items),
          JSON.stringify(p.lines),
          JSON.stringify(p.needs),
        ]);
        return rows[0].id as string;
      });

      const quote = await db.query(
        "select current_snapshot_id, total_price::text from quotes where id = $1",
        [quoteId],
      );
      expect(quote.rows[0]).toEqual({ current_snapshot_id: snapshotId, total_price: "200.00" });
      const line = await db.query(
        "select l.snapshot_item_id is not null as linked, s.calculated_by, s.warnings from quote_snapshot_lines l join quote_cost_snapshots s on s.id = l.snapshot_id where l.snapshot_id = $1",
        [snapshotId],
      );
      expect(line.rows[0]).toEqual({ linked: true, calculated_by: vendedor.id, warnings: ["aviso de teste"] });

      await asUser(db, vendedor, (q) => q("update quotes set status = 'enviado' where id = $1", [quoteId]));

      await expect(
        asUser(db, vendedor, (q) => q("update quote_items set quantity = 2 where id = $1", [itemId])),
      ).rejects.toThrow(/rascunho/);
      await expect(
        asUser(db, vendedor, (q) => q("update quotes set target_margin_percent = 10 where id = $1", [quoteId])),
      ).rejects.toThrow(/não pode ser editado/);
      await expect(
        asUser(db, vendedor, (q) => q("update quote_cost_snapshots set total_cost = 1 where id = $1", [snapshotId])),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("delete from quote_snapshot_lines where snapshot_id = $1", [snapshotId])).rejects.toThrow(
        /imutáveis/,
      );

      // Mudança de preço do fornecedor não altera a fotografia.
      await asUser(db, gestor, (q) =>
        q("update supplier_material_offers set price = 999 where id = $1", [offerId]),
      );
      const frozen = await db.query(
        "select unit_cost::text, amount::text from quote_snapshot_lines where snapshot_id = $1",
        [snapshotId],
      );
      expect(frozen.rows[0]).toEqual({ unit_cost: "150.000000", amount: "150.0000" });

      // Reabrir e alterar item invalida o cálculo vigente.
      await asUser(db, vendedor, (q) => q("update quotes set status = 'rascunho' where id = $1", [quoteId]));
      await asUser(db, vendedor, (q) => q("update quote_items set quantity = 2 where id = $1", [itemId]));
      const after = await db.query("select current_snapshot_id from quotes where id = $1", [quoteId]);
      expect(after.rows[0].current_snapshot_id).toBeNull();

      // Orçamento com fotografia não pode ser excluído.
      await expect(asUser(db, vendedor, (q) => q("delete from quotes where id = $1", [quoteId]))).rejects.toThrow(
        /não podem ser excluídos/,
      );
    });

    it("persiste o resultado real do motor de custos", async () => {
      const { quoteId, itemId } = await asUser(db, vendedor, async (q) => {
        const quote = await q(
          "insert into quotes (customer_id, target_margin_percent, freight_amount) values ($1, 30, 50) returning id",
          [customerId],
        );
        const item = await q(
          `insert into quote_items (quote_id, position, product_id, product_version_id, width_mm, height_mm, quantity)
           values ($1, 1, $2, $3, 1200, 800, 3) returning id`,
          [quote.rows[0].id, productId, versionId],
        );
        return { quoteId: quote.rows[0].id as string, itemId: item.rows[0].id as string };
      });

      const input = {
        items: [
          {
            quoteItemId: itemId, position: 1, description: null, widthMm: 1200, heightMm: 800, quantity: "3",
            includeInstallation: false, extraCost: "0",
            version: {
              id: versionId, productId, productCode: "P-QUOTE", productName: "Produto orçamento", versionNumber: 1,
              requiresDimensions: true, minWidthMm: null, maxWidthMm: null, minHeightMm: null, maxHeightMm: null,
              components: [
                { id: "00000000-0000-0000-0000-0000000000c1", position: 1, materialId, description: null, quantityBasis: "area" as const, coefficient: "1", offsetMm: "0", wastePercent: "8" },
              ],
              laborOperations: [],
            },
          },
        ],
        materials: {
          [materialId]: {
            materialId, code: "VID-8", description: "Vidro", warnings: [],
            consumptionUnit: { code: "m2", symbol: "m²", dimension: "area" as const, factorToBase: "1" },
            offer: {
              id: offerId, supplierId: "00000000-0000-0000-0000-000000000000", supplierName: "Fornecedor vidros",
              purchaseUnitCode: "m2", packageQuantity: "1", purchaseUnitCost: "150", unitCost: "150",
              quotedAt: "2026-10-01", validUntil: null, freshness: "vigente" as const,
            },
          },
        },
        laborRates: {},
        overheadRates: [],
        saleDeductions: [],
        parameters: { targetMarginPercent: "30", discountPercent: "0", freightAmount: "50", otherCostsAmount: "0" },
      };
      // Referências a ids inexistentes seriam barradas pelas FKs: usa o fornecedor real da oferta.
      const sup = await db.query("select supplier_id from supplier_material_offers where id = $1", [offerId]);
      input.materials[materialId].offer.supplierId = sup.rows[0].supplier_id;

      const result = calculateQuote(input);
      if (!result.ok) throw new Error(result.errors.join("; "));
      const p = toSnapshotPayload(input, result);

      await asUser(db, vendedor, (q) =>
        q("select public.save_quote_calculation($1, $2, $3, $4, $5)", [
          quoteId,
          JSON.stringify(p.snapshot),
          JSON.stringify(p.items),
          JSON.stringify(p.lines),
          JSON.stringify(p.needs),
        ]),
      );

      const saved = await db.query(
        `select s.material_cost::text, s.total_cost::text, s.final_price::text, s.net_margin_percent::text,
                (select count(*)::int from quote_snapshot_lines l where l.snapshot_id = s.id) as lines,
                (select purchase_quantity::text from quote_snapshot_purchase_needs n where n.snapshot_id = s.id) as purchase
         from quote_cost_snapshots s join quotes q on q.current_snapshot_id = s.id where q.id = $1`,
        [quoteId],
      );
      // 1,2 × 0,8 × 3 = 2,88 m² × 1,08 = 3,1104 m² × 150 = 466,56
      expect(saved.rows[0]).toEqual({
        material_cost: "466.56",
        total_cost: result.totals.totalCost.toFixed(2),
        final_price: result.totals.finalPrice.toFixed(2),
        net_margin_percent: result.totals.netMarginPercent.toFixed(4),
        lines: result.lines.length,
        purchase: "4.000000",
      });
    });

    it("rejeita cálculo que não cobre todos os itens", async () => {
      await asUser(
        db,
        vendedor,
        async (q) => {
          const quote = await q(
            "insert into quotes (customer_id, target_margin_percent) values ($1, 25) returning id",
            [customerId],
          );
          await q(
            `insert into quote_items (quote_id, position, product_id, product_version_id, width_mm, height_mm, quantity)
             values ($1, 1, $2, $3, 1000, 1000, 1)`,
            [quote.rows[0].id, productId, versionId],
          );
          const p = snapshotPayload("00000000-0000-0000-0000-000000000000");
          const msg = await expectFailure(db, "select public.save_quote_calculation($1, $2, $3, $4, $5)", [
            quote.rows[0].id,
            JSON.stringify(p.snapshot),
            JSON.stringify(p.items),
            JSON.stringify(p.lines),
            JSON.stringify(p.needs),
          ]);
          expect(msg).toMatch(/mudaram/);
        },
        { rollback: true },
      );
    });
  });

  describe("auditoria", () => {
    it("registra alterações e restringe leitura a gestores", async () => {
      const supplierId = await createSupplier("Fornecedor auditado");
      await asUser(db, gestor, (q) => q("update suppliers set payment_terms = '30 dias' where id = $1", [supplierId]));
      const { rows } = await asUser(db, gestor, (q) =>
        q("select action, changed_fields, changed_by from audit_log where record_id = $1 order by id", [
          supplierId,
        ]),
      );
      expect(rows.map((r) => r.action)).toEqual(["INSERT", "UPDATE"]);
      expect(rows[1].changed_fields).toEqual(["payment_terms"]);
      expect(rows[1].changed_by).toBe(gestor.id);

      const asSeller = await asUser(db, vendedor, (q) => q("select * from audit_log"));
      expect(asSeller.rows).toHaveLength(0);
    });

    it("admin pode alterar perfis", async () => {
      const r = await asUser(db, admin, (q) =>
        q("update profiles set max_discount_percent = 3 where id = $1", [outroVendedor.id]),
      );
      expect(r.rowCount).toBe(1);
    });
  });
});
