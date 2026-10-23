-- =============================================================================
-- 06 · Histórico de alterações (auditoria) e políticas de acesso (RLS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auditoria genérica
-- -----------------------------------------------------------------------------
-- JSONB é adequado aqui: o registro guarda a imagem da linha em cada momento,
-- independentemente da estrutura da tabela de origem.
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, changed_at desc);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);

create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function app_private.forbid_mutation();

create or replace function app_private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into v_changed
    from jsonb_each(v_new) n
    where n.key not in ('updated_at', 'updated_by')
      and n.value is distinct from (v_old -> n.key);
    if v_changed is null then
      return null;  -- nada relevante mudou
    end if;
  end if;

  insert into public.audit_log (table_name, record_id, action, changed_fields, old_data, new_data, changed_by)
  values (
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'code', v_old ->> 'code'),
    tg_op,
    v_changed,
    v_old,
    v_new,
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'units', 'material_categories', 'product_lines', 'product_categories', 'company_settings',
    'customers', 'suppliers', 'supplier_contacts', 'materials', 'supplier_material_offers',
    'labor_rates', 'overhead_rates', 'sale_deduction_rates',
    'products', 'product_versions', 'product_components', 'product_labor_operations',
    'quotes', 'quote_items'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function app_private.audit_row()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privilégios: nada para anônimos; usuários autenticados passam pelas políticas.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function
  public.create_product_version_draft(uuid, uuid),
  public.publish_product_version(uuid, text),
  public.save_quote_calculation(uuid, jsonb, jsonb, jsonb, jsonb)
to authenticated;

-- Tabelas imutáveis/geridas por trigger: sem escrita direta.
revoke insert, update, delete on public.material_price_history from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke update, delete on public.quote_cost_snapshots, public.quote_snapshot_items,
  public.quote_snapshot_lines, public.quote_snapshot_purchase_needs from authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'units', 'material_categories', 'product_lines', 'product_categories', 'company_settings',
    'customers', 'suppliers', 'supplier_contacts', 'materials', 'supplier_material_offers',
    'material_price_history', 'labor_rates', 'overhead_rates', 'sale_deduction_rates',
    'products', 'product_versions', 'product_components', 'product_labor_operations',
    'quotes', 'quote_items', 'quote_cost_snapshots', 'quote_snapshot_items', 'quote_snapshot_lines',
    'quote_snapshot_purchase_needs', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Perfis: cada um vê o próprio; administradores e gestores veem todos;
-- somente administradores alteram papéis, limites e status.
create policy "profiles: leitura" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select app_private.is_manager()));

create policy "profiles: alteração por admin" on public.profiles
  for update to authenticated
  using ((select app_private.has_role('admin')))
  with check ((select app_private.has_role('admin')));

-- Leitura para qualquer membro ativo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'units', 'material_categories', 'product_lines', 'product_categories', 'company_settings',
    'customers', 'suppliers', 'supplier_contacts', 'materials', 'supplier_material_offers',
    'material_price_history', 'labor_rates', 'overhead_rates', 'sale_deduction_rates',
    'products', 'product_versions', 'product_components', 'product_labor_operations',
    'quotes', 'quote_items', 'quote_cost_snapshots', 'quote_snapshot_items', 'quote_snapshot_lines',
    'quote_snapshot_purchase_needs'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select app_private.is_member()))',
      t || ': leitura por membros', t
    );
  end loop;
end;
$$;

-- Escrita de cadastros técnicos, preços e parâmetros: administradores e gestores.
do $$
declare
  t text;
begin
  foreach t in array array[
    'units', 'material_categories', 'product_lines', 'product_categories',
    'suppliers', 'supplier_contacts', 'materials', 'supplier_material_offers',
    'labor_rates', 'overhead_rates', 'sale_deduction_rates',
    'products', 'product_versions', 'product_components', 'product_labor_operations'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select app_private.is_manager()))',
      t || ': inclusão por gestores', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select app_private.is_manager())) with check ((select app_private.is_manager()))',
      t || ': alteração por gestores', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select app_private.is_manager()))',
      t || ': exclusão por gestores', t
    );
  end loop;
end;
$$;

-- Configurações gerais: somente administradores alteram.
create policy "company_settings: alteração por admin" on public.company_settings
  for update to authenticated
  using ((select app_private.has_role('admin')))
  with check ((select app_private.has_role('admin')));

-- Clientes: qualquer membro cadastra e edita; exclusão por gestores.
create policy "customers: inclusão por membros" on public.customers
  for insert to authenticated with check ((select app_private.is_member()));
create policy "customers: alteração por membros" on public.customers
  for update to authenticated
  using ((select app_private.is_member())) with check ((select app_private.is_member()));
create policy "customers: exclusão por gestores" on public.customers
  for delete to authenticated using ((select app_private.is_manager()));

-- Orçamentos: membros criam; o autor ou um gestor altera.
create or replace function app_private.can_edit_quote(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_manager()
      or exists (
        select 1 from public.quotes q
        where q.id = p_quote_id and q.created_by = auth.uid() and app_private.is_member()
      );
$$;
revoke all on function app_private.can_edit_quote(uuid) from public;
grant execute on function app_private.can_edit_quote(uuid) to authenticated;

create policy "quotes: inclusão por membros" on public.quotes
  for insert to authenticated with check ((select app_private.is_member()));
create policy "quotes: alteração pelo autor ou gestor" on public.quotes
  for update to authenticated
  using (app_private.can_edit_quote(id)) with check ((select app_private.is_member()));
create policy "quotes: exclusão pelo autor ou gestor" on public.quotes
  for delete to authenticated using (app_private.can_edit_quote(id));

create policy "quote_items: inclusão" on public.quote_items
  for insert to authenticated with check (app_private.can_edit_quote(quote_id));
create policy "quote_items: alteração" on public.quote_items
  for update to authenticated
  using (app_private.can_edit_quote(quote_id)) with check (app_private.can_edit_quote(quote_id));
create policy "quote_items: exclusão" on public.quote_items
  for delete to authenticated using (app_private.can_edit_quote(quote_id));

-- Fotografias: inclusão por quem pode editar o orçamento; nunca alteradas.
create policy "quote_cost_snapshots: inclusão" on public.quote_cost_snapshots
  for insert to authenticated with check (app_private.can_edit_quote(quote_id));

create policy "quote_snapshot_items: inclusão" on public.quote_snapshot_items
  for insert to authenticated with check (
    exists (select 1 from public.quote_cost_snapshots s
            where s.id = snapshot_id and app_private.can_edit_quote(s.quote_id))
  );
create policy "quote_snapshot_lines: inclusão" on public.quote_snapshot_lines
  for insert to authenticated with check (
    exists (select 1 from public.quote_cost_snapshots s
            where s.id = snapshot_id and app_private.can_edit_quote(s.quote_id))
  );
create policy "quote_snapshot_purchase_needs: inclusão" on public.quote_snapshot_purchase_needs
  for insert to authenticated with check (
    exists (select 1 from public.quote_cost_snapshots s
            where s.id = snapshot_id and app_private.can_edit_quote(s.quote_id))
  );

-- Auditoria: leitura por administradores e gestores.
create policy "audit_log: leitura por gestores" on public.audit_log
  for select to authenticated using ((select app_private.is_manager()));
