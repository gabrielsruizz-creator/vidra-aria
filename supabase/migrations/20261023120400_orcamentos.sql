-- =============================================================================
-- 05 · Orçamentos, itens e fotografias de custo (snapshots imutáveis)
-- =============================================================================

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  status public.quote_status not null default 'rascunho',
  title text,                                   -- referência / obra
  issue_date date not null default current_date,
  valid_until date,
  -- Parâmetros comerciais
  target_margin_percent numeric(7,4) not null
    check (target_margin_percent >= 0 and target_margin_percent < 100),
  discount_percent numeric(7,4) not null default 0
    check (discount_percent >= 0 and discount_percent < 100),
  freight_amount numeric(14,2) not null default 0 check (freight_amount >= 0),
  other_costs_amount numeric(14,2) not null default 0 check (other_costs_amount >= 0),
  other_costs_description text,
  payment_terms text,
  delivery_terms text,
  customer_notes text,      -- aparece na proposta
  internal_notes text,      -- uso interno
  -- Totais da fotografia vigente (cache para listagens e painel)
  current_snapshot_id uuid, -- FK adicionada após quote_cost_snapshots
  total_cost numeric(14,2),
  list_price numeric(14,2),
  discount_amount numeric(14,2),
  total_price numeric(14,2),
  contribution_margin numeric(14,2),
  net_profit numeric(14,2),
  net_margin_percent numeric(9,4),
  calculated_at timestamptz,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint quotes_validity_chk check (valid_until is null or valid_until >= issue_date)
);
create index quotes_customer_idx on public.quotes (customer_id);
create index quotes_status_idx on public.quotes (status);
create index quotes_issue_date_idx on public.quotes (issue_date desc);

create trigger quotes_stamp before insert or update on public.quotes
  for each row execute function app_private.stamp_row();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null default 0,
  product_id uuid not null references public.products (id) on delete restrict,
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  description text,
  width_mm integer check (width_mm > 0 and width_mm <= 100000),
  height_mm integer check (height_mm > 0 and height_mm <= 100000),
  quantity numeric(12,3) not null check (quantity > 0),
  include_installation boolean not null default false,
  extra_cost numeric(14,2) not null default 0 check (extra_cost >= 0),
  extra_cost_description text,
  notes text,
  -- Resultado do último cálculo (cache; a fonte de verdade é o snapshot)
  unit_cost numeric(14,4),
  total_cost numeric(14,2),
  unit_price numeric(14,2),
  total_price numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index quote_items_quote_idx on public.quote_items (quote_id, position);
create index quote_items_version_idx on public.quote_items (product_version_id);

create trigger quote_items_stamp before insert or update on public.quote_items
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Fotografias de custo
-- -----------------------------------------------------------------------------
create table public.quote_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete restrict,
  sequence integer not null check (sequence > 0),
  engine_version text not null,
  calculated_at timestamptz not null default now(),
  calculated_by uuid,
  -- Parâmetros usados
  target_margin_percent numeric(7,4) not null,
  discount_percent numeric(7,4) not null,
  sale_deductions_percent numeric(7,4) not null,
  freight_amount numeric(14,2) not null,
  other_costs_amount numeric(14,2) not null,
  -- Custos
  material_cost numeric(14,2) not null,
  labor_cost numeric(14,2) not null,
  installation_cost numeric(14,2) not null,
  item_extra_cost numeric(14,2) not null,
  freight_cost numeric(14,2) not null,
  other_cost numeric(14,2) not null,
  overhead_cost numeric(14,2) not null,
  variable_cost numeric(14,2) not null,
  total_cost numeric(14,2) not null,
  purchase_need_cost numeric(14,2) not null,
  -- Preços e resultado
  list_price numeric(14,2) not null,
  discount_amount numeric(14,2) not null,
  final_price numeric(14,2) not null,
  sale_deductions_amount numeric(14,2) not null,
  contribution_margin numeric(14,2) not null,
  contribution_margin_percent numeric(9,4) not null,
  net_profit numeric(14,2) not null,
  net_margin_percent numeric(9,4) not null,
  warnings text[] not null default '{}',
  constraint quote_cost_snapshots_seq_uniq unique (quote_id, sequence)
);
comment on table public.quote_cost_snapshots is
  'Fotografia imutável de um cálculo: preços, taxas e regras vigentes no momento. Nunca recalculada.';

alter table public.quotes
  add constraint quotes_current_snapshot_fk
  foreign key (current_snapshot_id) references public.quote_cost_snapshots (id) on delete restrict;

create table public.quote_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.quote_cost_snapshots (id) on delete restrict,
  quote_item_id uuid not null,  -- sem FK: o item pode ser removido depois (o snapshot permanece)
  position integer not null,
  product_id uuid not null references public.products (id) on delete restrict,
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  product_code text not null,
  product_name text not null,
  version_number integer not null,
  description text,
  width_mm integer,
  height_mm integer,
  quantity numeric(12,3) not null,
  area_m2 numeric(14,6),
  perimeter_m numeric(14,6),
  include_installation boolean not null,
  -- Valores para a quantidade total do item
  material_cost numeric(14,4) not null,
  labor_cost numeric(14,4) not null,
  installation_cost numeric(14,4) not null,
  extra_cost numeric(14,4) not null,
  allocated_freight numeric(14,4) not null,
  allocated_other_cost numeric(14,4) not null,
  overhead_cost numeric(14,4) not null,
  total_cost numeric(14,4) not null,
  unit_cost numeric(14,4) not null,
  unit_list_price numeric(14,2) not null,
  total_list_price numeric(14,2) not null,
  constraint quote_snapshot_items_pos_uniq unique (snapshot_id, position)
);
create index quote_snapshot_items_snapshot_idx on public.quote_snapshot_items (snapshot_id);

create table public.quote_snapshot_lines (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.quote_cost_snapshots (id) on delete restrict,
  snapshot_item_id uuid references public.quote_snapshot_items (id) on delete restrict,
  line_type public.snapshot_line_type not null,
  description text not null,
  -- Referências à origem (para rastreabilidade; os valores ficam copiados abaixo)
  material_id uuid references public.materials (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete restrict,
  offer_id uuid references public.supplier_material_offers (id) on delete restrict,
  labor_rate_id uuid references public.labor_rates (id) on delete restrict,
  overhead_rate_id uuid references public.overhead_rates (id) on delete restrict,
  sale_deduction_rate_id uuid references public.sale_deduction_rates (id) on delete restrict,
  product_component_id uuid,
  material_code text,
  supplier_name text,
  quantity_basis public.quantity_basis,
  unit_code text,
  quantity_net numeric(18,6),
  waste_percent numeric(7,4),
  quantity_gross numeric(18,6),
  unit_cost numeric(18,6),
  rate numeric(14,4),          -- % ou R$/h, conforme o tipo
  amount numeric(14,4) not null,
  price_quoted_at date,
  price_valid_until date
);
create index quote_snapshot_lines_snapshot_idx on public.quote_snapshot_lines (snapshot_id);
create index quote_snapshot_lines_item_idx on public.quote_snapshot_lines (snapshot_item_id);

create table public.quote_snapshot_purchase_needs (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.quote_cost_snapshots (id) on delete restrict,
  material_id uuid not null references public.materials (id) on delete restrict,
  material_code text not null,
  material_description text not null,
  consumption_unit_code text not null,
  gross_consumption numeric(18,6) not null,
  offer_id uuid references public.supplier_material_offers (id) on delete restrict,
  supplier_id uuid references public.suppliers (id) on delete restrict,
  supplier_name text,
  purchase_unit_code text not null,
  units_per_purchase numeric(18,6) not null,
  purchase_quantity numeric(18,6) not null,
  purchase_unit_cost numeric(14,4) not null,
  purchase_cost numeric(14,2) not null,
  leftover_quantity numeric(18,6) not null,
  constraint quote_snapshot_purchase_needs_uniq unique (snapshot_id, material_id)
);

-- Snapshots são imutáveis.
create trigger quote_cost_snapshots_immutable before update or delete on public.quote_cost_snapshots
  for each row execute function app_private.forbid_mutation();
create trigger quote_snapshot_items_immutable before update or delete on public.quote_snapshot_items
  for each row execute function app_private.forbid_mutation();
create trigger quote_snapshot_lines_immutable before update or delete on public.quote_snapshot_lines
  for each row execute function app_private.forbid_mutation();
create trigger quote_snapshot_purchase_needs_immutable before update or delete on public.quote_snapshot_purchase_needs
  for each row execute function app_private.forbid_mutation();

create or replace function app_private.stamp_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.calculated_at := now();
  new.calculated_by := auth.uid();
  return new;
end;
$$;

create trigger quote_cost_snapshots_stamp before insert on public.quote_cost_snapshots
  for each row execute function app_private.stamp_snapshot();

-- -----------------------------------------------------------------------------
-- Regras de negócio dos orçamentos
-- -----------------------------------------------------------------------------

-- Ciclo de vida, edição só em rascunho e limite de desconto do usuário.
create or replace function app_private.guard_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_max numeric;
  v_frozen text[] := array['status', 'internal_notes', 'sent_at', 'decided_at', 'updated_at', 'updated_by'];
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho'
       or exists (select 1 from public.quote_cost_snapshots cs where cs.quote_id = old.id) then
      raise exception 'Orçamentos já calculados ou enviados não podem ser excluídos; use o status cancelado.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- Desconto acima do limite do usuário
  if auth.uid() is not null
     and (tg_op = 'INSERT' or new.discount_percent is distinct from old.discount_percent) then
    v_max := coalesce(app_private.max_discount_percent(), 0);
    if new.discount_percent > v_max then
      raise exception using
        message = format('Desconto de %s%% acima do limite autorizado para o usuário (%s%%).',
                         new.discount_percent, v_max),
        errcode = 'insufficient_privilege';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' then
      raise exception 'Orçamentos começam como rascunho.' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- Fora do rascunho, apenas status e observações internas mudam.
  if old.status <> 'rascunho'
     and (to_jsonb(new) - v_frozen) <> (to_jsonb(old) - v_frozen) then
    raise exception 'Orçamento % não pode ser editado. Volte-o para rascunho primeiro.', old.status
      using errcode = 'check_violation';
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'rascunho' and new.status in ('enviado', 'cancelado'))
      or (old.status = 'enviado' and new.status in ('aprovado', 'recusado', 'expirado', 'cancelado', 'rascunho'))
      or (old.status in ('recusado', 'expirado') and new.status = 'rascunho')
      or (old.status = 'aprovado' and new.status = 'cancelado')
    ) then
      raise exception 'Transição de status inválida: % -> %.', old.status, new.status
        using errcode = 'check_violation';
    end if;
    if new.status = 'enviado' and new.current_snapshot_id is null then
      raise exception 'Calcule o orçamento antes de enviá-lo.' using errcode = 'check_violation';
    end if;
    if new.status = 'enviado' then
      new.sent_at := now();
    elsif new.status in ('aprovado', 'recusado', 'expirado', 'cancelado') then
      new.decided_at := now();
    elsif new.status = 'rascunho' then
      new.decided_at := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger quotes_guard
  before insert or update or delete on public.quotes
  for each row execute function app_private.guard_quote();

-- Itens só mudam em orçamentos em rascunho e usam versões publicadas do produto.
create or replace function app_private.guard_quote_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_quote_id uuid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
  v_status public.quote_status;
  v_version_product uuid;
  v_version_status public.product_version_status;
  v_requires_dimensions boolean;
begin
  select q.status into v_status from public.quotes q where q.id = v_quote_id;
  if found and v_status <> 'rascunho' then
    raise exception 'Itens só podem ser alterados com o orçamento em rascunho.' using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and new.quote_id <> old.quote_id then
    raise exception 'Item não pode mudar de orçamento.' using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' or new.product_version_id <> old.product_version_id or new.product_id <> old.product_id then
    select pv.product_id, pv.status into v_version_product, v_version_status
    from public.product_versions pv where pv.id = new.product_version_id;
    if v_version_product is distinct from new.product_id then
      raise exception 'A versão informada não pertence ao produto.' using errcode = 'check_violation';
    end if;
    if v_version_status <> 'publicada' then
      raise exception 'Use a versão publicada da ficha técnica.' using errcode = 'check_violation';
    end if;
  end if;

  select p.requires_dimensions into v_requires_dimensions from public.products p where p.id = new.product_id;
  if v_requires_dimensions and (new.width_mm is null or new.height_mm is null) then
    raise exception 'Informe largura e altura do item.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger quote_items_guard
  before insert or update or delete on public.quote_items
  for each row execute function app_private.guard_quote_item();

-- -----------------------------------------------------------------------------
-- Gravação atômica de um cálculo (fotografia + cache nos itens e no orçamento)
-- -----------------------------------------------------------------------------
-- O cálculo é feito pelo motor de custos da aplicação (TypeScript, decimal.js).
-- Esta função apenas persiste o resultado de forma transacional e relacional;
-- o JSON é somente o meio de transporte da chamada.
create or replace function public.save_quote_calculation(
  p_quote_id uuid,
  p_snapshot jsonb,
  p_items jsonb,
  p_lines jsonb,
  p_purchase_needs jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_snapshot_id uuid;
  v_sequence integer;
  v_expected integer;
  v_received integer;
  s public.quote_cost_snapshots;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'no_data_found';
  end if;
  if v_quote.status <> 'rascunho' then
    raise exception 'Somente orçamentos em rascunho podem ser recalculados.' using errcode = 'check_violation';
  end if;

  -- O cálculo precisa cobrir exatamente os itens atuais do orçamento.
  select count(*) into v_expected from public.quote_items where quote_id = p_quote_id;
  select count(*) into v_received
  from jsonb_array_elements(p_items) e
  join public.quote_items qi on qi.id = (e ->> 'quote_item_id')::uuid and qi.quote_id = p_quote_id;
  if v_expected = 0 then
    raise exception 'Adicione ao menos um item antes de calcular.' using errcode = 'check_violation';
  end if;
  if v_expected <> v_received or v_received <> jsonb_array_length(p_items) then
    raise exception 'Os itens do orçamento mudaram durante o cálculo. Calcule novamente.'
      using errcode = 'serialization_failure';
  end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.quote_cost_snapshots where quote_id = p_quote_id;

  s := jsonb_populate_record(null::public.quote_cost_snapshots, p_snapshot);

  insert into public.quote_cost_snapshots (
    quote_id, sequence, engine_version,
    target_margin_percent, discount_percent, sale_deductions_percent, freight_amount, other_costs_amount,
    material_cost, labor_cost, installation_cost, item_extra_cost, freight_cost, other_cost,
    overhead_cost, variable_cost, total_cost, purchase_need_cost,
    list_price, discount_amount, final_price, sale_deductions_amount,
    contribution_margin, contribution_margin_percent, net_profit, net_margin_percent, warnings
  ) values (
    p_quote_id, v_sequence, s.engine_version,
    s.target_margin_percent, s.discount_percent, s.sale_deductions_percent, s.freight_amount, s.other_costs_amount,
    s.material_cost, s.labor_cost, s.installation_cost, s.item_extra_cost, s.freight_cost, s.other_cost,
    s.overhead_cost, s.variable_cost, s.total_cost, s.purchase_need_cost,
    s.list_price, s.discount_amount, s.final_price, s.sale_deductions_amount,
    s.contribution_margin, s.contribution_margin_percent, s.net_profit, s.net_margin_percent,
    coalesce(s.warnings, '{}')
  ) returning id into v_snapshot_id;

  insert into public.quote_snapshot_items (
    snapshot_id, quote_item_id, position, product_id, product_version_id, product_code, product_name,
    version_number, description, width_mm, height_mm, quantity, area_m2, perimeter_m, include_installation,
    material_cost, labor_cost, installation_cost, extra_cost, allocated_freight, allocated_other_cost,
    overhead_cost, total_cost, unit_cost, unit_list_price, total_list_price
  )
  select v_snapshot_id, i.quote_item_id, i.position, i.product_id, i.product_version_id, i.product_code,
         i.product_name, i.version_number, i.description, i.width_mm, i.height_mm, i.quantity, i.area_m2,
         i.perimeter_m, i.include_installation, i.material_cost, i.labor_cost, i.installation_cost,
         i.extra_cost, i.allocated_freight, i.allocated_other_cost, i.overhead_cost, i.total_cost,
         i.unit_cost, i.unit_list_price, i.total_list_price
  from jsonb_populate_recordset(null::public.quote_snapshot_items, p_items) i;

  insert into public.quote_snapshot_lines (
    snapshot_id, snapshot_item_id, line_type, description, material_id, supplier_id, offer_id,
    labor_rate_id, overhead_rate_id, sale_deduction_rate_id, product_component_id, material_code,
    supplier_name, quantity_basis, unit_code, quantity_net, waste_percent, quantity_gross, unit_cost,
    rate, amount, price_quoted_at, price_valid_until
  )
  select v_snapshot_id, si.id, l.line_type, l.description, l.material_id, l.supplier_id, l.offer_id,
         l.labor_rate_id, l.overhead_rate_id, l.sale_deduction_rate_id, l.product_component_id,
         l.material_code, l.supplier_name, l.quantity_basis, l.unit_code, l.quantity_net,
         l.waste_percent, l.quantity_gross, l.unit_cost, l.rate, l.amount, l.price_quoted_at,
         l.price_valid_until
  from jsonb_array_elements(p_lines) e
  cross join lateral jsonb_populate_record(null::public.quote_snapshot_lines, e) l
  left join public.quote_snapshot_items si
    on si.snapshot_id = v_snapshot_id and si.position = (e ->> 'item_position')::integer;

  insert into public.quote_snapshot_purchase_needs (
    snapshot_id, material_id, material_code, material_description, consumption_unit_code,
    gross_consumption, offer_id, supplier_id, supplier_name, purchase_unit_code, units_per_purchase,
    purchase_quantity, purchase_unit_cost, purchase_cost, leftover_quantity
  )
  select v_snapshot_id, n.material_id, n.material_code, n.material_description, n.consumption_unit_code,
         n.gross_consumption, n.offer_id, n.supplier_id, n.supplier_name, n.purchase_unit_code,
         n.units_per_purchase, n.purchase_quantity, n.purchase_unit_cost, n.purchase_cost, n.leftover_quantity
  from jsonb_populate_recordset(null::public.quote_snapshot_purchase_needs, p_purchase_needs) n;

  update public.quote_items qi
  set unit_cost = i.unit_cost,
      total_cost = round(i.total_cost, 2),
      unit_price = i.unit_list_price,
      total_price = i.total_list_price
  from jsonb_populate_recordset(null::public.quote_snapshot_items, p_items) i
  where qi.id = i.quote_item_id and qi.quote_id = p_quote_id;

  update public.quotes
  set current_snapshot_id = v_snapshot_id,
      total_cost = s.total_cost,
      list_price = s.list_price,
      discount_amount = s.discount_amount,
      total_price = s.final_price,
      contribution_margin = s.contribution_margin,
      net_profit = s.net_profit,
      net_margin_percent = s.net_margin_percent,
      calculated_at = now()
  where id = p_quote_id;

  return v_snapshot_id;
end;
$$;

-- Qualquer alteração em parâmetros ou itens invalida o cálculo vigente:
-- o orçamento precisa ser recalculado antes de ser enviado.
create or replace function app_private.invalidate_quote_calculation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_quote_id uuid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - array['unit_cost', 'total_cost', 'unit_price', 'total_price', 'updated_at', 'updated_by'])
       = (to_jsonb(old) - array['unit_cost', 'total_cost', 'unit_price', 'total_price', 'updated_at', 'updated_by']) then
    return new;
  end if;
  update public.quotes set current_snapshot_id = null
  where id = v_quote_id and current_snapshot_id is not null and status = 'rascunho';
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger quote_items_invalidate
  after insert or update or delete on public.quote_items
  for each row execute function app_private.invalidate_quote_calculation();

create or replace function app_private.invalidate_quote_on_params()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'rascunho' and new.current_snapshot_id is not distinct from old.current_snapshot_id
     and (new.target_margin_percent, new.discount_percent, new.freight_amount, new.other_costs_amount)
       is distinct from (old.target_margin_percent, old.discount_percent, old.freight_amount, old.other_costs_amount) then
    new.current_snapshot_id := null;
  end if;
  return new;
end;
$$;

create trigger quotes_invalidate_on_params
  before update on public.quotes
  for each row execute function app_private.invalidate_quote_on_params();
