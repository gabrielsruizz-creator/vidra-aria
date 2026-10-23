import { randomUUID } from "node:crypto";

import { Client } from "pg";

export const DATABASE_URL = process.env.TEST_DATABASE_URL;

/** Conexão de superusuário (postgres) usada para preparar dados. */
export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

export type TestUser = { id: string; email: string };

/** Cria um usuário em auth.users (o trigger cria o perfil) e ajusta papel/status. */
export async function createUser(
  db: Client,
  opts: { role?: "admin" | "gestor" | "vendedor"; active?: boolean; maxDiscount?: number } = {},
): Promise<TestUser> {
  const id = randomUUID();
  const email = `${id.slice(0, 8)}@teste.local`;
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    email,
    { full_name: "Usuário de teste" },
  ]);
  await db.query(
    "update public.profiles set role = $2, active = $3, max_discount_percent = $4 where id = $1",
    [id, opts.role ?? "vendedor", opts.active ?? true, opts.maxDiscount ?? 0],
  );
  return { id, email };
}

/**
 * Executa `fn` como o usuário informado (papel `authenticated` + claims JWT),
 * dentro de uma transação que é desfeita ao final quando `rollback` é true.
 */
export async function asUser<T>(
  db: Client,
  user: TestUser | null,
  fn: (q: Client["query"]) => Promise<T>,
  { rollback = false }: { rollback?: boolean } = {},
): Promise<T> {
  await db.query("begin");
  try {
    if (user) {
      await db.query("select set_config('role', 'authenticated', true)");
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: user.id, role: "authenticated" }),
      ]);
    } else {
      await db.query("select set_config('role', 'anon', true)");
      await db.query("select set_config('request.jwt.claims', '', true)");
    }
    const result = await fn(db.query.bind(db) as Client["query"]);
    await db.query(rollback ? "rollback" : "commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}

/** Executa um comando que deve falhar, sem abortar a transação corrente. */
export async function expectFailure(
  db: Client,
  sql: string,
  params: unknown[] = [],
): Promise<string> {
  await db.query("savepoint expect_failure");
  try {
    await db.query(sql, params);
  } catch (error) {
    await db.query("rollback to savepoint expect_failure");
    return (error as Error).message;
  }
  await db.query("release savepoint expect_failure");
  throw new Error(`Era esperado erro em: ${sql}`);
}

export async function lookupId(db: Client, sql: string, params: unknown[] = []): Promise<string> {
  const { rows } = await db.query(sql, params);
  if (!rows[0]) throw new Error(`Nenhuma linha para: ${sql}`);
  return rows[0].id as string;
}
