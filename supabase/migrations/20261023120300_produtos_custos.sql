-- =============================================================================
-- 04 · Parâmetros de custo e produtos com fichas técnicas versionadas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mão de obra direta
-- -----------------------------------------------------------------------------
create table public.labor_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  -- Custo por hora já com encargos, conforme apuração da empresa.
  hourly_cost numeric(14,4) not null check (hourly_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index labor_rates_name_uidx on public.labor_rates (lower(name));

create trigger labor_rates_stamp before insert or update on public.labor_rates
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Custos indiretos (rateio)
-- -----------------------------------------------------------------------------
create table public.overhead_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  method public.overhead_method not null,
  -- percentual_custo_direto: % sobre materiais + mão de obra direta;
  -- valor_por_hora_mo: R$ por hora de mão de obra direta apontada na ficha.
  rate numeric(14,4) not null check (rate >= 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint overhead_percent_chk check (method <> 'percentual_custo_direto' or rate <= 1000)
);
create unique index overhead_rates_name_uidx on public.overhead_rates (lower(name));

create trigger overhead_rates_stamp before insert or update on public.overhead_rates
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Tributos, comissões e taxas incidentes sobre o preço de venda
-- -----------------------------------------------------------------------------
create table public.sale_deduction_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind public.sale_deduction_kind not null,
  percent numeric(7,4) not null check (percent >= 0 and percent < 100),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index sale_deduction_rates_name_uidx on public.sale_deduction_rates (lower(name));

create trigger sale_deduction_rates_stamp before insert or update on public.sale_deduction_rates
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Produtos (modelos comerciais)
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Za-z0-9._/-]{1,40}$'),
  name text not null check (length(trim(name)) > 0),
  category_id uuid not null references public.product_categories (id) on delete restrict,
  product_line_id uuid references public.product_lines (id) on delete restrict,
  description text,
  -- false para itens sem medidas (ex.: kit de acessórios vendido por unidade).
  requires_dimensions boolean not null default true,
  -- Produto padronizado (medidas de catálogo) ou sob medida.
  is_custom_size boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index products_code_uidx on public.products (lower(code));
create index products_category_idx on public.products (category_id);
create index products_line_idx on public.products (product_line_id);

create trigger products_stamp before insert or update on public.products
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Versões da ficha técnica
-- -----------------------------------------------------------------------------
create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status public.product_version_status not null default 'rascunho',
  change_summary text,
  -- Limites de medidas aceitos pela ficha (opcionais).
  min_width_mm integer check (min_width_mm > 0),
  max_width_mm integer check (max_width_mm > 0),
  min_height_mm integer check (min_height_mm > 0),
  max_height_mm integer check (max_height_mm > 0),
  notes text,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint product_versions_number_uniq unique (product_id, version_number),
  constraint product_versions_width_chk check (min_width_mm is null or max_width_mm is null or min_width_mm <= max_width_mm),
  constraint product_versions_height_chk check (min_height_mm is null or max_height_mm is null or min_height_mm <= max_height_mm),
  constraint product_versions_published_chk check (status = 'rascunho' or published_at is not null)
);
comment on table public.product_versions is
  'Ficha técnica versionada. Somente rascunhos podem ser editados; versões publicadas são imutáveis.';
create unique index product_versions_one_published_uidx
  on public.product_versions (product_id) where status = 'publicada';

create trigger product_versions_stamp before insert or update on public.product_versions
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Componentes (materiais) da ficha
-- -----------------------------------------------------------------------------
create table public.product_components (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.product_versions (id) on delete cascade,
  position integer not null default 0,
  material_id uuid not null references public.materials (id) on delete restrict,
  description text,                 -- função do componente (ex.: "montante lateral")
  -- Quantidade por unidade de produto:
  --   fixa      -> coeficiente (na unidade de consumo do material)
  --   largura   -> coeficiente × (largura + ajuste)            [m]
  --   altura    -> coeficiente × (altura + ajuste)             [m]
  --   perimetro -> coeficiente × (2·largura + 2·altura + ajuste) [m]
  --   area      -> coeficiente × largura × altura              [m²]
  quantity_basis public.quantity_basis not null,
  coefficient numeric(18,6) not null check (coefficient > 0),
  offset_mm numeric(10,2) not null default 0,
  waste_percent numeric(7,4) not null default 0 check (waste_percent >= 0 and waste_percent < 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint product_components_offset_chk check (quantity_basis in ('largura', 'altura', 'perimetro') or offset_mm = 0)
);
create index product_components_version_idx on public.product_components (product_version_id, position);
create index product_components_material_idx on public.product_components (material_id);

create trigger product_components_stamp before insert or update on public.product_components
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Operações de mão de obra (tempos de fabricação e instalação)
-- -----------------------------------------------------------------------------
create table public.product_labor_operations (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.product_versions (id) on delete cascade,
  position integer not null default 0,
  labor_rate_id uuid not null references public.labor_rates (id) on delete restrict,
  stage public.labor_stage not null default 'fabricacao',
  description text not null check (length(trim(description)) > 0),
  -- Minutos por unidade da base (fixa: por produto; largura/altura/perimetro: por metro; area: por m²).
  time_basis public.quantity_basis not null default 'fixa',
  minutes numeric(12,4) not null check (minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index product_labor_version_idx on public.product_labor_operations (product_version_id, position);

create trigger product_labor_operations_stamp before insert or update on public.product_labor_operations
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Regras de integridade das fichas
-- -----------------------------------------------------------------------------

-- Componentes e operações só mudam enquanto a versão é rascunho.
create or replace function app_private.assert_version_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_status public.product_version_status;
  v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_ids := array[new.product_version_id];
  elsif tg_op = 'UPDATE' then
    v_ids := array[old.product_version_id, new.product_version_id];
  else
    v_ids := array[old.product_version_id];
  end if;

  foreach v_id in array v_ids loop
    select pv.status into v_status from public.product_versions pv where pv.id = v_id;
    -- Versão inexistente: exclusão em cascata de um rascunho em andamento.
    if found and v_status <> 'rascunho' then
      raise exception 'A ficha técnica está %; crie uma nova versão para alterá-la.', v_status
        using errcode = 'check_violation';
    end if;
  end loop;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger product_components_draft_only
  before insert or update or delete on public.product_components
  for each row execute function app_private.assert_version_draft();

create trigger product_labor_operations_draft_only
  before insert or update or delete on public.product_labor_operations
  for each row execute function app_private.assert_version_draft();

-- A base de dimensionamento precisa ser compatível com a unidade de consumo do material.
create or replace function app_private.check_component_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dimension public.unit_dimension;
begin
  select u.dimension into v_dimension
  from public.materials m
  join public.units u on u.code = m.consumption_unit_code
  where m.id = new.material_id;

  if new.quantity_basis in ('largura', 'altura', 'perimetro') and v_dimension <> 'comprimento' then
    raise exception 'Base linear exige material consumido em unidade de comprimento (ex.: m).'
      using errcode = 'check_violation';
  elsif new.quantity_basis = 'area' and v_dimension <> 'area' then
    raise exception 'Base por área exige material consumido em unidade de área (ex.: m²).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger product_components_unit_check
  before insert or update on public.product_components
  for each row execute function app_private.check_component_unit();

-- A unidade de consumo de um material usado em fichas não pode mudar
-- (invalidaria quantidades já configuradas).
create or replace function app_private.lock_material_consumption_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.consumption_unit_code <> old.consumption_unit_code
     and exists (select 1 from public.product_components pc where pc.material_id = new.id) then
    raise exception 'Material usado em fichas técnicas: a unidade de consumo não pode ser alterada.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger materials_lock_consumption_unit
  before update on public.materials
  for each row execute function app_private.lock_material_consumption_unit();

-- Ciclo de vida da versão: rascunho -> publicada -> arquivada.
create or replace function app_private.guard_product_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'Somente rascunhos podem ser excluídos.' using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if new.product_id <> old.product_id or new.version_number <> old.version_number then
    raise exception 'Produto e número da versão não podem ser alterados.' using errcode = 'check_violation';
  end if;

  if old.status = 'rascunho' then
    if new.status = 'publicada' then
      new.published_at := now();
      new.published_by := auth.uid();
    elsif new.status = 'arquivada' then
      raise exception 'Publique a versão antes de arquivá-la, ou exclua o rascunho.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- Versão publicada/arquivada: somente transição publicada -> arquivada.
  if old.status = 'publicada' and new.status = 'arquivada'
     and (to_jsonb(new) - array['status', 'updated_at', 'updated_by'])
       = (to_jsonb(old) - array['status', 'updated_at', 'updated_by']) then
    return new;
  end if;

  raise exception 'Versão % não pode ser alterada.', old.status using errcode = 'check_violation';
end;
$$;

create trigger product_versions_guard
  before update or delete on public.product_versions
  for each row execute function app_private.guard_product_version();

-- -----------------------------------------------------------------------------
-- Operações de versionamento (chamadas pela aplicação via RPC)
-- -----------------------------------------------------------------------------

-- Cria um rascunho, opcionalmente copiando uma versão existente.
create or replace function public.create_product_version_draft(
  p_product_id uuid,
  p_source_version_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_id uuid;
  v_number integer;
  v_src public.product_versions;
begin
  if exists (select 1 from public.product_versions where product_id = p_product_id and status = 'rascunho') then
    raise exception 'Já existe um rascunho para este produto.' using errcode = 'check_violation';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_number
  from public.product_versions where product_id = p_product_id;

  if p_source_version_id is not null then
    select * into v_src from public.product_versions
    where id = p_source_version_id and product_id = p_product_id;
    if not found then
      raise exception 'Versão de origem não encontrada para este produto.' using errcode = 'no_data_found';
    end if;
  end if;

  insert into public.product_versions (
    product_id, version_number, status, min_width_mm, max_width_mm, min_height_mm, max_height_mm, notes
  ) values (
    p_product_id, v_number, 'rascunho', v_src.min_width_mm, v_src.max_width_mm,
    v_src.min_height_mm, v_src.max_height_mm, v_src.notes
  ) returning id into v_new_id;

  if p_source_version_id is not null then
    insert into public.product_components (
      product_version_id, position, material_id, description, quantity_basis,
      coefficient, offset_mm, waste_percent, notes
    )
    select v_new_id, position, material_id, description, quantity_basis,
           coefficient, offset_mm, waste_percent, notes
    from public.product_components where product_version_id = p_source_version_id;

    insert into public.product_labor_operations (
      product_version_id, position, labor_rate_id, stage, description, time_basis, minutes
    )
    select v_new_id, position, labor_rate_id, stage, description, time_basis, minutes
    from public.product_labor_operations where product_version_id = p_source_version_id;
  end if;

  return v_new_id;
end;
$$;

-- Publica um rascunho e arquiva a versão publicada anterior, atomicamente.
create or replace function public.publish_product_version(p_version_id uuid, p_change_summary text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version public.product_versions;
begin
  select * into v_version from public.product_versions where id = p_version_id for update;
  if not found then
    raise exception 'Versão não encontrada.' using errcode = 'no_data_found';
  end if;
  if v_version.status <> 'rascunho' then
    raise exception 'Somente rascunhos podem ser publicados.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.product_components where product_version_id = p_version_id)
     and not exists (select 1 from public.product_labor_operations where product_version_id = p_version_id) then
    raise exception 'A ficha precisa de ao menos um componente ou operação.' using errcode = 'check_violation';
  end if;

  update public.product_versions set status = 'arquivada'
  where product_id = v_version.product_id and status = 'publicada';

  update public.product_versions
  set status = 'publicada', change_summary = coalesce(p_change_summary, change_summary)
  where id = p_version_id;
end;
$$;
