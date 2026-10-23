-- =============================================================================
-- 03 · Cadastros: clientes, fornecedores, materiais, ofertas e histórico de preços
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  person_type public.person_type not null default 'fisica',
  name text not null check (length(trim(name)) > 0),
  trade_name text,
  -- CPF (11) ou CNPJ (14), apenas dígitos. Opcional.
  document text check (document ~ '^\d{11}$' or document ~ '^\d{14}$'),
  email text,
  phone text,
  address_street text,
  address_number text,
  address_complement text,
  address_district text,
  address_city text,
  address_state char(2) check (address_state ~ '^[A-Z]{2}$'),
  address_postal_code text check (address_postal_code ~ '^\d{8}$'),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint customers_document_type_chk check (
    document is null
    or (person_type = 'fisica' and length(document) = 11)
    or (person_type = 'juridica' and length(document) = 14)
  )
);
create unique index customers_document_uidx on public.customers (document) where document is not null;
create index customers_name_idx on public.customers (lower(name));

create trigger customers_stamp before insert or update on public.customers
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Fornecedores e contatos
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(trim(legal_name)) > 0),  -- razão social
  trade_name text,                                                -- nome fantasia
  cnpj text check (cnpj ~ '^\d{14}$'),
  payment_terms text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index suppliers_cnpj_uidx on public.suppliers (cnpj) where cnpj is not null;
create index suppliers_name_idx on public.suppliers (lower(legal_name));

create trigger suppliers_stamp before insert or update on public.suppliers
  for each row execute function app_private.stamp_row();

create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index supplier_contacts_supplier_idx on public.supplier_contacts (supplier_id);
create unique index supplier_contacts_primary_uidx
  on public.supplier_contacts (supplier_id) where is_primary;

create trigger supplier_contacts_stamp before insert or update on public.supplier_contacts
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Materiais
-- -----------------------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null check (internal_code ~ '^[A-Za-z0-9._/-]{1,40}$'),
  description text not null check (length(trim(description)) > 0),
  category_id uuid not null references public.material_categories (id) on delete restrict,
  -- Linha de aplicação. Nulo = uso geral (qualquer linha).
  product_line_id uuid references public.product_lines (id) on delete restrict,
  purchase_unit_code text not null references public.units (code) on delete restrict,
  consumption_unit_code text not null references public.units (code) on delete restrict,
  -- Quantas unidades de consumo existem em 1 unidade de compra
  -- (ex.: barra de 6 m consumida em metros -> 6).
  conversion_factor numeric(18,6) not null default 1 check (conversion_factor > 0),
  -- Comprimento comercial (ex.: barra de perfil), quando aplicável.
  commercial_length_mm integer check (commercial_length_mm > 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint materials_same_unit_factor_chk
    check (purchase_unit_code <> consumption_unit_code or conversion_factor = 1)
);
comment on column public.materials.conversion_factor is
  'Unidades de consumo por unidade de compra padrão do material.';
create unique index materials_internal_code_uidx on public.materials (lower(internal_code));
create index materials_category_idx on public.materials (category_id);
create index materials_line_idx on public.materials (product_line_id);
create index materials_description_idx on public.materials (lower(description));

create trigger materials_stamp before insert or update on public.materials
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Ofertas de fornecedores por material (N:N com atributos)
-- -----------------------------------------------------------------------------
create table public.supplier_material_offers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  material_id uuid not null references public.materials (id) on delete restrict,
  supplier_item_code text,
  -- Unidade em que o fornecedor vende (pode diferir da unidade de compra padrão).
  purchase_unit_code text not null references public.units (code) on delete restrict,
  -- Quantidade, na UNIDADE DE CONSUMO do material, contida em 1 unidade de compra
  -- desta oferta (ex.: caixa com 100 parafusos -> 100; barra de 6 m -> 6).
  package_quantity numeric(18,6) not null check (package_quantity > 0),
  -- Preço bruto por unidade de compra, antes de descontos.
  price numeric(14,4) not null check (price >= 0),
  discount_percent numeric(7,4) not null default 0 check (discount_percent >= 0 and discount_percent < 100),
  -- Tributos não recuperáveis na compra (ex.: IPI, ST, DIFAL), em % sobre o preço com desconto.
  purchase_tax_percent numeric(7,4) not null default 0 check (purchase_tax_percent >= 0 and purchase_tax_percent <= 100),
  -- Frete alocado por unidade de compra, quando conhecido (nulo = desconhecido).
  freight_per_unit numeric(14,4) check (freight_per_unit >= 0),
  minimum_order_quantity numeric(18,6) check (minimum_order_quantity > 0),
  quoted_at date not null default current_date,      -- data da cotação/atualização
  valid_until date,                                   -- validade informada pelo fornecedor
  is_preferred boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint offers_validity_chk check (valid_until is null or valid_until >= quoted_at)
);
comment on table public.supplier_material_offers is
  'Preço vigente de cada fornecedor para cada material. Alterações geram material_price_history.';
create index offers_material_idx on public.supplier_material_offers (material_id) where active;
create index offers_supplier_idx on public.supplier_material_offers (supplier_id);
create index offers_quoted_at_idx on public.supplier_material_offers (quoted_at);
-- No máximo uma oferta preferencial ativa por material.
create unique index offers_preferred_uidx
  on public.supplier_material_offers (material_id) where is_preferred and active;
-- Evita duplicar a mesma embalagem do mesmo fornecedor para o mesmo material.
create unique index offers_unique_package_uidx
  on public.supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity)
  where active;

create trigger offers_stamp before insert or update on public.supplier_material_offers
  for each row execute function app_private.stamp_row();

-- -----------------------------------------------------------------------------
-- Histórico de preços (somente inserção, via trigger)
-- -----------------------------------------------------------------------------
create table public.material_price_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.supplier_material_offers (id) on delete restrict,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  material_id uuid not null references public.materials (id) on delete restrict,
  change_type text not null check (change_type in ('criacao', 'atualizacao')),
  purchase_unit_code text not null references public.units (code),
  package_quantity numeric(18,6) not null,
  price numeric(14,4) not null,
  discount_percent numeric(7,4) not null,
  purchase_tax_percent numeric(7,4) not null,
  freight_per_unit numeric(14,4),
  quoted_at date not null,
  valid_until date,
  recorded_at timestamptz not null default now(),
  recorded_by uuid
);
comment on table public.material_price_history is
  'Registro imutável de cada preço informado. Orçamentos usam fotografias próprias, não esta tabela.';
create index price_history_material_idx on public.material_price_history (material_id, recorded_at desc);
create index price_history_offer_idx on public.material_price_history (offer_id, recorded_at desc);

create or replace function app_private.record_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.price is not distinct from old.price
     and new.discount_percent is not distinct from old.discount_percent
     and new.purchase_tax_percent is not distinct from old.purchase_tax_percent
     and new.freight_per_unit is not distinct from old.freight_per_unit
     and new.package_quantity is not distinct from old.package_quantity
     and new.purchase_unit_code is not distinct from old.purchase_unit_code
     and new.quoted_at is not distinct from old.quoted_at
     and new.valid_until is not distinct from old.valid_until then
    return new;
  end if;

  insert into public.material_price_history (
    offer_id, supplier_id, material_id, change_type, purchase_unit_code, package_quantity,
    price, discount_percent, purchase_tax_percent, freight_per_unit, quoted_at, valid_until,
    recorded_by
  ) values (
    new.id, new.supplier_id, new.material_id,
    case when tg_op = 'INSERT' then 'criacao' else 'atualizacao' end,
    new.purchase_unit_code, new.package_quantity, new.price, new.discount_percent,
    new.purchase_tax_percent, new.freight_per_unit, new.quoted_at, new.valid_until,
    auth.uid()
  );
  return new;
end;
$$;

create trigger offers_price_history
  after insert or update on public.supplier_material_offers
  for each row execute function app_private.record_price_history();

-- Fornecedor e material de uma oferta não mudam: crie outra oferta.
create or replace function app_private.offers_lock_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.supplier_id <> old.supplier_id or new.material_id <> old.material_id then
    raise exception 'Fornecedor e material de uma oferta não podem ser alterados. Cadastre uma nova oferta.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger offers_lock_identity before update on public.supplier_material_offers
  for each row execute function app_private.offers_lock_identity();

-- Bloqueia alteração/remoção de registros históricos.
create or replace function app_private.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registros de % são imutáveis.', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger price_history_immutable
  before update or delete on public.material_price_history
  for each row execute function app_private.forbid_mutation();
