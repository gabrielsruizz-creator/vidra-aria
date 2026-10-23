-- =============================================================================
-- 02 · Tabelas de referência: unidades, categorias, linhas e configurações
-- =============================================================================
-- Os dados inseridos aqui são de REFERÊNCIA (unidades métricas e categorias
-- citadas no escopo do projeto). Nenhum preço, fornecedor ou cliente real.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unidades de medida
-- -----------------------------------------------------------------------------
create table public.units (
  code text primary key check (code ~ '^[a-z0-9_]{1,16}$'),
  name text not null,
  symbol text not null,
  dimension public.unit_dimension not null,
  -- Fator para a unidade-base da dimensão: comprimento -> metro, área -> m²,
  -- volume -> litro, massa -> kg. Para 'unidade' (peça, caixa, barra...) é 1
  -- e NÃO há conversão automática entre códigos diferentes.
  factor_to_base numeric(18,9) not null check (factor_to_base > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint units_unidade_factor_chk check (dimension <> 'unidade' or factor_to_base = 1)
);
comment on table public.units is 'Unidades de medida (sistema métrico) e fatores de conversão dentro da mesma dimensão.';

create trigger units_stamp before insert or update on public.units
  for each row execute function app_private.stamp_row();

insert into public.units (code, name, symbol, dimension, factor_to_base) values
  ('mm',    'Milímetro',        'mm',    'comprimento', 0.001),
  ('cm',    'Centímetro',       'cm',    'comprimento', 0.01),
  ('m',     'Metro',            'm',     'comprimento', 1),
  ('m2',    'Metro quadrado',   'm²',    'area',        1),
  ('cm2',   'Centímetro quadrado', 'cm²', 'area',       0.0001),
  ('kg',    'Quilograma',       'kg',    'massa',       1),
  ('g',     'Grama',            'g',     'massa',       0.001),
  ('l',     'Litro',            'L',     'volume',      1),
  ('ml',    'Mililitro',        'mL',    'volume',      0.001),
  ('un',    'Unidade',          'un',    'unidade',     1),
  ('pc',    'Peça',             'pç',    'unidade',     1),
  ('par',   'Par',              'par',   'unidade',     1),
  ('jg',    'Jogo',             'jg',    'unidade',     1),
  ('cj',    'Conjunto',         'cj',    'unidade',     1),
  ('kit',   'Kit',              'kit',   'unidade',     1),
  ('cx',    'Caixa',            'cx',    'unidade',     1),
  ('pct',   'Pacote',           'pct',   'unidade',     1),
  ('rolo',  'Rolo',             'rolo',  'unidade',     1),
  ('barra', 'Barra',            'br',    'unidade',     1),
  ('chapa', 'Chapa',            'ch',    'unidade',     1),
  ('tubo',  'Tubo/Bisnaga',     'tb',    'unidade',     1),
  ('lata',  'Lata',             'lt',    'unidade',     1);

-- -----------------------------------------------------------------------------
-- Categorias de materiais
-- -----------------------------------------------------------------------------
create table public.material_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create trigger material_categories_stamp before insert or update on public.material_categories
  for each row execute function app_private.stamp_row();

insert into public.material_categories (code, name, sort_order) values
  ('perfis_aluminio', 'Perfis de alumínio', 10),
  ('vidros',          'Vidros', 20),
  ('ferragens',       'Ferragens', 30),
  ('borrachas_escovas', 'Borrachas e escovas', 40),
  ('consumiveis',     'Consumíveis', 50),
  ('acessorios',      'Acessórios', 60),
  ('outros',          'Outros materiais', 70);

-- -----------------------------------------------------------------------------
-- Linhas de aplicação (ex.: linha Suprema de esquadrias)
-- -----------------------------------------------------------------------------
create table public.product_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index product_lines_name_uidx on public.product_lines (lower(name));

create trigger product_lines_stamp before insert or update on public.product_lines
  for each row execute function app_private.stamp_row();

-- A linha Suprema foi citada no escopo como a principal linha da empresa.
insert into public.product_lines (name, description) values
  ('Suprema', 'Linha de esquadrias de alumínio informada no escopo do projeto.');

-- -----------------------------------------------------------------------------
-- Categorias de produtos
-- -----------------------------------------------------------------------------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index product_categories_name_uidx on public.product_categories (lower(name));

create trigger product_categories_stamp before insert or update on public.product_categories
  for each row execute function app_private.stamp_row();

insert into public.product_categories (name, sort_order) values
  ('Janelas', 10),
  ('Portas', 20),
  ('Boxes de vidro', 30),
  ('Guarda-corpos', 40),
  ('Espelhos', 50),
  ('Vidros avulsos', 60),
  ('Outros produtos', 70);

-- -----------------------------------------------------------------------------
-- Configurações gerais (linha única)
-- -----------------------------------------------------------------------------
create table public.company_settings (
  id boolean primary key default true check (id),
  company_name text,
  -- Margem de lucro líquido desejada, sugerida em novos orçamentos.
  -- Nula até a empresa definir: o sistema não presume margens.
  default_target_margin_percent numeric(7,4)
    check (default_target_margin_percent >= 0 and default_target_margin_percent < 100),
  -- Dias após a data da cotação em que um preço de fornecedor é considerado desatualizado.
  price_stale_after_days integer not null default 90 check (price_stale_after_days between 1 and 3650),
  quote_validity_days integer not null default 15 check (quote_validity_days between 1 and 365),
  default_payment_terms text,
  proposal_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
comment on column public.company_settings.price_stale_after_days is
  'Padrão do sistema (90 dias); ajuste conforme a política de compras da empresa.';

create trigger company_settings_stamp before insert or update on public.company_settings
  for each row execute function app_private.stamp_row();

insert into public.company_settings (id) values (true);
