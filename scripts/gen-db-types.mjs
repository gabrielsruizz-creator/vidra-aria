#!/usr/bin/env node
/**
 * Gera src/server/db/database.types.ts a partir de um Postgres com as migrações
 * aplicadas (mesmo formato do `supabase gen types typescript`).
 *
 * Uso: TEST_DATABASE_URL=postgres://... node scripts/gen-db-types.mjs
 * (com o Supabase CLI disponível, `supabase gen types typescript --local` é equivalente).
 *
 * Diferença intencional: colunas numeric aceitam `string` em Insert/Update para
 * que valores decimais sejam enviados sem passar por ponto flutuante.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Defina TEST_DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const enums = (
  await client.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder)::text[] as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`)
).rows;
const enumNames = new Set(enums.map((e) => e.name));

const columns = (
  await client.query(`
    select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable = 'YES' as nullable,
           c.column_default is not null as has_default, c.is_identity = 'YES' as is_identity,
           c.identity_generation, c.is_generated = 'ALWAYS' as is_generated
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by c.table_name, c.ordinal_position`)
).rows;

const fks = (
  await client.query(`
    select con.conname as name, rel.relname as table_name, frel.relname as ref_table,
           array(select a.attname from unnest(con.conkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by k.ord)::text[] as columns,
           array(select a.attname from unnest(con.confkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by k.ord)::text[] as ref_columns,
           exists (
             select 1 from pg_index i
             where i.indrelid = con.conrelid and i.indisunique and i.indpred is null
               and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x)
                 = (select array_agg(x order by x) from unnest(con.conkey) x)
           ) as one_to_one
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_class frel on frel.oid = con.confrelid
    join pg_namespace n on n.oid = rel.relnamespace
    join pg_namespace fn on fn.oid = frel.relnamespace
    where con.contype = 'f' and n.nspname = 'public' and fn.nspname = 'public'
    order by rel.relname, con.conname`)
).rows;

const functions = (
  await client.query(`
    select p.proname as name,
           coalesce(p.proargnames, array[]::text[])::text[] as arg_names,
           array(select format_type(t, null) from unnest(p.proargtypes) t) ::text[] as arg_types,
           p.pronargdefaults as n_defaults,
           format_type(p.prorettype, null) as return_type
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
    order by p.proname`)
).rows;
await client.end();

function tsType(udt, dataType) {
  const base = udt.startsWith("_") ? udt.slice(1) : udt;
  let t;
  if (enumNames.has(base)) t = `Database["public"]["Enums"]["${base}"]`;
  else if (["int2", "int4", "float4", "float8", "numeric"].includes(base)) t = "number";
  else if (base === "int8") t = "number";
  else if (base === "bool") t = "boolean";
  else if (["json", "jsonb"].includes(base)) t = "Json";
  else t = "string";
  return dataType === "ARRAY" || udt.startsWith("_") ? `${t}[]` : t;
}
function writeType(udt, dataType) {
  const t = tsType(udt, dataType);
  return udt === "numeric" ? "number | string" : udt === "_numeric" ? "(number | string)[]" : t;
}
function pgToTs(pgType) {
  const map = { uuid: "string", text: "string", jsonb: "Json", json: "Json", integer: "number", boolean: "boolean", void: "undefined", numeric: "number" };
  if (pgType.endsWith("[]")) return `${pgToTs(pgType.slice(0, -2))}[]`;
  if (enumNames.has(pgType.replace(/^public\./, ""))) return `Database["public"]["Enums"]["${pgType.replace(/^public\./, "")}"]`;
  return map[pgType] ?? "string";
}

const tables = new Map();
for (const c of columns) {
  if (!tables.has(c.table_name)) tables.set(c.table_name, []);
  tables.get(c.table_name).push(c);
}

const out = [];
out.push("// Arquivo gerado por scripts/gen-db-types.mjs — não edite manualmente.");
out.push("");
out.push("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];");
out.push("");
out.push("export type Database = {");
out.push('  __InternalSupabase: { PostgrestVersion: "12.2.3" };');
out.push("  public: {");
out.push("    Tables: {");
for (const [table, cols] of tables) {
  out.push(`      ${table}: {`);
  out.push("        Row: {");
  for (const c of cols) out.push(`          ${c.column_name}: ${tsType(c.udt_name, c.data_type)}${c.nullable ? " | null" : ""};`);
  out.push("        };");
  for (const kind of ["Insert", "Update"]) {
    out.push(`        ${kind}: {`);
    for (const c of cols) {
      const generated = c.is_generated || c.identity_generation === "ALWAYS";
      if (generated) {
        out.push(`          ${c.column_name}?: never;`);
        continue;
      }
      const optional = kind === "Update" || c.nullable || c.has_default || c.is_identity;
      out.push(`          ${c.column_name}${optional ? "?" : ""}: ${writeType(c.udt_name, c.data_type)}${c.nullable ? " | null" : ""};`);
    }
    out.push("        };");
  }
  out.push("        Relationships: [");
  for (const fk of fks.filter((f) => f.table_name === table)) {
    out.push("          {");
    out.push(`            foreignKeyName: "${fk.name}";`);
    out.push(`            columns: [${fk.columns.map((x) => `"${x}"`).join(", ")}];`);
    out.push(`            isOneToOne: ${fk.one_to_one};`);
    out.push(`            referencedRelation: "${fk.ref_table}";`);
    out.push(`            referencedColumns: [${fk.ref_columns.map((x) => `"${x}"`).join(", ")}];`);
    out.push("          },");
  }
  out.push("        ];");
  out.push("        ComputedFields: never;");
  out.push("      };");
}
out.push("    };");
out.push("    Views: { [_ in never]: never };");
out.push("    Functions: {");
for (const f of functions) {
  const required = f.arg_types.length - f.n_defaults;
  const args = f.arg_types.map((t, i) => `${f.arg_names[i]}${i >= required ? "?" : ""}: ${pgToTs(t)}`);
  out.push(`      ${f.name}: { Args: { ${args.join("; ")} }; Returns: ${pgToTs(f.return_type)} };`);
}
out.push("    };");
out.push("    Enums: {");
for (const e of enums) out.push(`      ${e.name}: ${e.labels.map((l) => `"${l}"`).join(" | ")};`);
out.push("    };");
out.push("    CompositeTypes: { [_ in never]: never };");
out.push("  };");
out.push("};");
out.push("");
out.push('export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];');
out.push('export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];');
out.push('export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];');
out.push('export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];');
out.push("");

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../src/server/db/database.types.ts");
writeFileSync(target, out.join("\n"));
console.log(`Tipos gerados em ${target}`);
