import "server-only";

import type { QuoteStatus } from "@/domain/quotes/status";
import type { SupabaseServerClient } from "@/lib/supabase/server";

import { ilikePattern, unwrap, unwrapMaybe } from "./util";

export async function listQuotes(db: SupabaseServerClient, filters: { q?: string; status?: QuoteStatus | "" } = {}) {
  let query = db
    .from("quotes")
    .select("id, number, title, status, issue_date, valid_until, total_price, total_cost, net_margin_percent, current_snapshot_id, calculated_at, customer:customers(id, name)")
    .order("number", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q?.trim()) {
    const term = filters.q.trim();
    const number = Number.parseInt(term.replace(/\D/g, ""), 10);
    const p = ilikePattern(term);
    const customers = unwrap(await db.from("customers").select("id").ilike("name", p).limit(200));
    const ors = [`title.ilike.${p}`];
    if (Number.isFinite(number)) ors.push(`number.eq.${number}`);
    if (customers.length) ors.push(`customer_id.in.(${customers.map((c) => c.id).join(",")})`);
    query = query.or(ors.join(","));
  }
  return unwrap(await query.limit(300));
}

export async function getQuote(db: SupabaseServerClient, id: string) {
  return unwrapMaybe(
    await db
      .from("quotes")
      .select("*, customer:customers(*)")
      .eq("id", id)
      .maybeSingle(),
  );
}

export async function listQuoteItems(db: SupabaseServerClient, quoteId: string) {
  return unwrap(
    await db
      .from("quote_items")
      .select("*, product:products(code, name, description, requires_dimensions), version:product_versions(version_number, status)")
      .eq("quote_id", quoteId)
      .order("position")
      .order("created_at"),
  );
}

export async function listSnapshots(db: SupabaseServerClient, quoteId: string) {
  return unwrap(
    await db
      .from("quote_cost_snapshots")
      .select("id, sequence, calculated_at, calculated_by, engine_version, total_cost, final_price, net_margin_percent, warnings")
      .eq("quote_id", quoteId)
      .order("sequence", { ascending: false }),
  );
}

export async function getSnapshotDetail(db: SupabaseServerClient, snapshotId: string) {
  const [snapshot, items, lines, needs] = await Promise.all([
    db.from("quote_cost_snapshots").select("*").eq("id", snapshotId).maybeSingle(),
    db.from("quote_snapshot_items").select("*").eq("snapshot_id", snapshotId).order("position"),
    db.from("quote_snapshot_lines").select("*").eq("snapshot_id", snapshotId),
    db.from("quote_snapshot_purchase_needs").select("*").eq("snapshot_id", snapshotId).order("material_code"),
  ]);
  const s = unwrapMaybe(snapshot);
  if (!s) return null;
  return { snapshot: s, items: unwrap(items), lines: unwrap(lines), needs: unwrap(needs) };
}
export type SnapshotDetail = NonNullable<Awaited<ReturnType<typeof getSnapshotDetail>>>;
