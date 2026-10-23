-- =============================================================================
-- 01 · Fundação: esquema privado, tipos, funções utilitárias, perfis e papéis
-- =============================================================================
-- Convenções do projeto:
--   * Tabelas e colunas em inglês (padrão técnico); textos de negócio, enums e
--     mensagens em português.
--   * Dinheiro: numeric(14,2) para totais, numeric(14,4) para preços unitários
--     de compra e valores de linha; custos unitários de consumo numeric(18,6).
--     Nunca usar float/real/double precision para valores monetários.
--   * Percentuais: numeric(7,4) em pontos percentuais (12,5% = 12.5000).
--   * Medidas de produto: inteiros em milímetros.
--   * Toda tabela de negócio tem created_at/updated_at/created_by/updated_by.
--     created_by/updated_by guardam o uuid do usuário sem FK: usuários devem ser
--     desativados (profiles.active = false), não excluídos, para preservar autoria.
-- =============================================================================

create schema if not exists app_private;
comment on schema app_private is
  'Funções internas (triggers e auxiliares de RLS). Não deve ser exposto pela API.';

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'gestor', 'vendedor');
comment on type public.app_role is
  'admin: tudo, inclusive usuários; gestor: cadastros, preços e taxas; vendedor: clientes e orçamentos.';

create type public.unit_dimension as enum ('comprimento', 'area', 'volume', 'massa', 'unidade');

create type public.quantity_basis as enum ('fixa', 'largura', 'altura', 'perimetro', 'area');
comment on type public.quantity_basis is
  'Base genérica de dimensionamento de componentes. Não representa fórmula técnica de corte.';

create type public.product_version_status as enum ('rascunho', 'publicada', 'arquivada');
create type public.labor_stage as enum ('fabricacao', 'instalacao');
create type public.overhead_method as enum ('percentual_custo_direto', 'valor_por_hora_mo');
create type public.sale_deduction_kind as enum ('tributo', 'comissao', 'taxa_financeira', 'outro');
create type public.quote_status as enum ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado', 'cancelado');
create type public.person_type as enum ('fisica', 'juridica');
create type public.snapshot_line_type as enum (
  'material', 'mao_de_obra', 'instalacao', 'custo_indireto', 'frete', 'outro_custo', 'deducao_venda'
);

-- -----------------------------------------------------------------------------
-- Trigger genérico de carimbo de data/autoria
-- -----------------------------------------------------------------------------
create or replace function app_private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    -- Autoria vem da sessão autenticada; ignora valores enviados pelo cliente.
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.updated_by := auth.uid();
    end if;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    if auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'vendedor',
  -- Novos cadastros entram inativos: um administrador precisa liberar o acesso.
  active boolean not null default false,
  -- Desconto comercial máximo que o usuário pode conceder sem outra aprovação.
  max_discount_percent numeric(7,4) not null default 0
    check (max_discount_percent >= 0 and max_discount_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
comment on table public.profiles is 'Perfil, papel e status de acesso de cada usuário autenticado.';

create trigger profiles_stamp before insert or update on public.profiles
  for each row execute function app_private.stamp_row();

-- Cria o perfil automaticamente quando um usuário se cadastra no Supabase Auth.
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Auxiliares de autorização usados pelas políticas RLS
-- (security definer para ler profiles sem recursão de RLS)
-- -----------------------------------------------------------------------------
create or replace function app_private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.active
  );
$$;

create or replace function app_private.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = any (roles) from public.profiles p where p.id = auth.uid() and p.active),
    false
  );
$$;

create or replace function app_private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_role('admin', 'gestor');
$$;

create or replace function app_private.max_discount_percent()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.role = 'admin' then 100::numeric
    else p.max_discount_percent
  end
  from public.profiles p
  where p.id = auth.uid() and p.active;
$$;

revoke all on all functions in schema app_private from public;
grant execute on function
  app_private.is_member(),
  app_private.has_role(variadic public.app_role[]),
  app_private.is_manager(),
  app_private.max_discount_percent()
to authenticated, service_role;
