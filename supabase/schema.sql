-- Esquadra / Supabase schema
-- Execute este arquivo primeiro no SQL Editor do Supabase.
-- Ele cria as tabelas, funcoes, triggers, views, RLS e permissoes.

begin;

create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cnpj text,
  phone text,
  email text,
  address text,
  logo_url text,
  default_margin numeric(5, 2) not null default 25 check (default_margin >= 0 and default_margin < 100),
  default_tax numeric(5, 2) not null default 8.5 check (default_tax >= 0 and default_tax < 100),
  default_fixed_cost numeric(5, 2) not null default 12 check (default_fixed_cost >= 0 and default_fixed_cost < 100),
  default_retention numeric(5, 2) not null default 5 check (default_retention >= 0 and default_retention < 100),
  default_validity_days integer not null default 30 check (default_validity_days > 0),
  default_interest_rate numeric(5, 2) not null default 1.99 check (default_interest_rate >= 0),
  opening_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'orcamentista' check (role in ('admin', 'gerente', 'orcamentista', 'visualizador')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  category text,
  contact text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  status text not null default 'ativo' check (status in ('ativo', 'prospect', 'inativo')),
  lgpd_consent boolean not null default false,
  lgpd_consent_at timestamptz,
  last_contact_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  phone text,
  commission_rate numeric(5, 2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  active boolean not null default true,
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  activity_at timestamptz not null default now(),
  title text not null,
  description text,
  status text not null default 'agendado' check (status in ('agendado', 'pendente', 'confirmado', 'concluido', 'cancelado')),
  responsible_id uuid references public.team_members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('perfis', 'vidros', 'ferragens', 'insumos')),
  unit text not null check (unit in ('m', 'm2', 'un')),
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  stock_quantity numeric(14, 2) not null default 0 check (stock_quantity >= 0),
  stock_capacity numeric(14, 2) not null default 100 check (stock_capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code)
);

create table if not exists public.material_price_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  reference_month date not null,
  cost numeric(14, 2) not null check (cost >= 0),
  created_at timestamptz not null default now(),
  unique (material_id, reference_month)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  width_m numeric(8, 2) not null default 0 check (width_m >= 0),
  height_m numeric(8, 2) not null default 0 check (height_m >= 0),
  material_cost numeric(14, 2) not null default 0 check (material_cost >= 0),
  labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  code text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'em_analise', 'aprovado', 'recusado')),
  issue_date date not null default current_date,
  valid_until date,
  delivery_days integer not null default 30 check (delivery_days > 0),
  installation_type text not null default 'obra' check (installation_type in ('obra', 'troca', 'fachada', 'somente_fornecimento')),
  address text,
  fixed_cost_pct numeric(5, 2) not null default 12 check (fixed_cost_pct >= 0 and fixed_cost_pct < 100),
  margin_pct numeric(5, 2) not null default 25 check (margin_pct >= 0 and margin_pct < 100),
  tax_pct numeric(5, 2) not null default 8.5 check (tax_pct >= 0 and tax_pct < 100),
  retention_pct numeric(5, 2) not null default 5 check (retention_pct >= 0 and retention_pct < 100),
  cash_discount_pct numeric(5, 2) not null default 5 check (cash_discount_pct >= 0 and cash_discount_pct < 100),
  interest_rate_monthly numeric(5, 2) not null default 1.99 check (interest_rate_monthly >= 0),
  material_total numeric(14, 2) not null default 0,
  labor_total numeric(14, 2) not null default 0,
  fixed_total numeric(14, 2) not null default 0,
  margin_total numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  cash_total numeric(14, 2) not null default 0,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  width_m numeric(8, 2) not null default 0 check (width_m >= 0),
  height_m numeric(8, 2) not null default 0 check (height_m >= 0),
  quantity integer not null default 1 check (quantity > 0),
  material_unit_cost numeric(14, 2) not null default 0 check (material_unit_cost >= 0),
  labor_unit_cost numeric(14, 2) not null default 0 check (labor_unit_cost >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  quote_id uuid references public.quotes (id) on delete set null,
  title text not null,
  status text not null default 'orcado' check (status in ('orcado', 'aprovado', 'em_producao', 'agendado', 'em_instalacao', 'concluido', 'cancelado')),
  value numeric(14, 2) not null default 0 check (value >= 0),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  due_date date,
  installer_id uuid references public.team_members (id) on delete set null,
  material_cost numeric(14, 2) not null default 0 check (material_cost >= 0),
  labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  fixed_cost numeric(14, 2) not null default 0 check (fixed_cost >= 0),
  tax_cost numeric(14, 2) not null default 0 check (tax_cost >= 0),
  planned_profit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  installer_id uuid references public.team_members (id) on delete set null,
  scheduled_date date not null,
  address text,
  status text not null default 'agendado' check (status in ('agendado', 'confirmado', 'reagendar', 'concluido', 'cancelado')),
  value numeric(14, 2) not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('receivable', 'payable')),
  description text not null,
  category text,
  client_id uuid references public.clients (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  due_date date not null,
  paid_at date,
  status text not null default 'pendente' check (status in ('pendente', 'recebido', 'pago', 'atrasado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user on public.workspace_members (user_id);
create index if not exists idx_clients_workspace on public.clients (workspace_id);
create index if not exists idx_client_activities_client on public.client_activities (client_id, activity_at desc);
create index if not exists idx_materials_workspace on public.materials (workspace_id, category);
create index if not exists idx_material_price_history_material on public.material_price_history (material_id, reference_month);
create index if not exists idx_quotes_workspace on public.quotes (workspace_id, issue_date desc);
create index if not exists idx_quotes_status on public.quotes (workspace_id, status);
create index if not exists idx_quote_items_quote on public.quote_items (quote_id);
create index if not exists idx_projects_workspace on public.projects (workspace_id, status);
create index if not exists idx_projects_client on public.projects (client_id);
create unique index if not exists idx_projects_quote on public.projects (quote_id) where quote_id is not null;
create index if not exists idx_installations_schedule on public.installations (workspace_id, scheduled_date);
create index if not exists idx_transactions_due on public.transactions (workspace_id, due_date desc);
create index if not exists idx_transactions_type_status on public.transactions (workspace_id, type, status);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_write_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role in ('admin', 'gerente', 'orcamentista')
  );
$$;

create or replace function private.can_manage_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role in ('admin', 'gerente')
  );
$$;

create or replace function private.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role = 'admin'
  );
$$;

create or replace function private.shares_workspace(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs using (workspace_id)
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles as p (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when p.full_name = '' then excluded.full_name else p.full_name end;

  return new;
end;
$$;

create or replace function private.recalculate_quote_totals(target_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes%rowtype;
  v_mat numeric;
  v_lab numeric;
  v_fixed numeric;
  v_margin numeric;
  v_tax numeric;
  v_total numeric;
begin
  select * into q from public.quotes where id = target_quote_id;
  if not found then
    return;
  end if;

  select
    coalesce(sum(material_unit_cost * quantity), 0),
    coalesce(sum(labor_unit_cost * quantity), 0)
  into v_mat, v_lab
  from public.quote_items
  where quote_id = target_quote_id;

  v_fixed := (v_mat + v_lab) * q.fixed_cost_pct / 100;
  v_margin := (v_mat + v_lab + v_fixed) * q.margin_pct / 100;
  v_tax := (v_mat + v_lab + v_fixed + v_margin) * q.tax_pct / 100;
  v_total := v_mat + v_lab + v_fixed + v_margin + v_tax;

  update public.quotes
  set material_total = v_mat,
      labor_total = v_lab,
      fixed_total = v_fixed,
      margin_total = v_margin,
      tax_total = v_tax,
      total = v_total,
      cash_total = v_total * (1 - cash_discount_pct / 100),
      updated_at = now()
  where id = target_quote_id;
end;
$$;

create or replace function private.on_quote_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.recalculate_quote_totals(old.quote_id);
    return old;
  end if;

  perform private.recalculate_quote_totals(new.quote_id);
  return new;
end;
$$;

create or replace function private.on_quote_percentages_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.recalculate_quote_totals(new.id);
  return new;
end;
$$;

create or replace function private.log_material_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.material_price_history (workspace_id, material_id, reference_month, cost)
    values (new.workspace_id, new.id, date_trunc('month', current_date)::date, new.cost)
    on conflict (material_id, reference_month) do update set cost = excluded.cost;
  elsif new.cost is distinct from old.cost then
    insert into public.material_price_history (workspace_id, material_id, reference_month, cost)
    values (new.workspace_id, new.id, date_trunc('month', current_date)::date, new.cost)
    on conflict (material_id, reference_month) do update set cost = excluded.cost;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_workspace_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  idx integer := 0;
  ref_table text;
  ref_column text;
  ref_workspace uuid;
  ref_id uuid;
begin
  while idx < tg_nargs loop
    ref_table := tg_argv[idx];
    ref_column := tg_argv[idx + 1];
    idx := idx + 2;

    ref_id := (to_jsonb(new) ->> ref_column)::uuid;
    if ref_id is null then
      continue;
    end if;

    execute format('select workspace_id from public.%I where id = $1', ref_table)
      into ref_workspace
      using ref_id;

    if ref_workspace is distinct from (to_jsonb(new) ->> 'workspace_id')::uuid then
      raise exception 'O campo %.% deve referenciar um registro do mesmo workspace.', tg_table_name, ref_column;
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.save_quote(p_quote jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote_id uuid := nullif(p_quote ->> 'id', '')::uuid;
  v_workspace_id uuid := nullif(p_quote ->> 'workspace_id', '')::uuid;
  v_client_id uuid := nullif(p_quote ->> 'client_id', '')::uuid;
  v_item jsonb;
begin
  if v_workspace_id is null or not private.can_write_workspace(v_workspace_id) then
    raise exception 'Sem permissao para salvar orcamentos neste workspace.';
  end if;

  if v_client_id is null then
    raise exception 'Selecione um cliente.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Adicione pelo menos um item ao orcamento.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um item ao orcamento.';
  end if;

  if v_quote_id is null then
    insert into public.quotes (
      workspace_id, client_id, code, status, issue_date, valid_until, delivery_days,
      installation_type, address, fixed_cost_pct, margin_pct, tax_pct, retention_pct,
      cash_discount_pct, interest_rate_monthly, notes, created_by
    )
    values (
      v_workspace_id,
      v_client_id,
      coalesce(nullif(trim(p_quote ->> 'code'), ''), 'ORC-' || to_char(current_date, 'YYYYMMDD')),
      coalesce(nullif(p_quote ->> 'status', ''), 'rascunho'),
      coalesce(nullif(p_quote ->> 'issue_date', '')::date, current_date),
      nullif(p_quote ->> 'valid_until', '')::date,
      greatest(1, coalesce((p_quote ->> 'delivery_days')::integer, 30)),
      coalesce(nullif(p_quote ->> 'installation_type', ''), 'obra'),
      nullif(p_quote ->> 'address', ''),
      least(99.99, greatest(0, coalesce((p_quote ->> 'fixed_cost_pct')::numeric, 12))),
      least(99.99, greatest(0, coalesce((p_quote ->> 'margin_pct')::numeric, 25))),
      least(99.99, greatest(0, coalesce((p_quote ->> 'tax_pct')::numeric, 8.5))),
      least(99.99, greatest(0, coalesce((p_quote ->> 'retention_pct')::numeric, 5))),
      least(99.99, greatest(0, coalesce((p_quote ->> 'cash_discount_pct')::numeric, 5))),
      greatest(0, coalesce((p_quote ->> 'interest_rate_monthly')::numeric, 1.99)),
      coalesce(p_quote ->> 'notes', ''),
      (select auth.uid())
    )
    returning id into v_quote_id;
  else
    update public.quotes
    set client_id = v_client_id,
        code = coalesce(nullif(trim(p_quote ->> 'code'), ''), code),
        status = coalesce(nullif(p_quote ->> 'status', ''), status),
        issue_date = coalesce(nullif(p_quote ->> 'issue_date', '')::date, issue_date),
        valid_until = nullif(p_quote ->> 'valid_until', '')::date,
        delivery_days = greatest(1, coalesce((p_quote ->> 'delivery_days')::integer, delivery_days)),
        installation_type = coalesce(nullif(p_quote ->> 'installation_type', ''), installation_type),
        address = nullif(p_quote ->> 'address', ''),
        fixed_cost_pct = least(99.99, greatest(0, coalesce((p_quote ->> 'fixed_cost_pct')::numeric, fixed_cost_pct))),
        margin_pct = least(99.99, greatest(0, coalesce((p_quote ->> 'margin_pct')::numeric, margin_pct))),
        tax_pct = least(99.99, greatest(0, coalesce((p_quote ->> 'tax_pct')::numeric, tax_pct))),
        retention_pct = least(99.99, greatest(0, coalesce((p_quote ->> 'retention_pct')::numeric, retention_pct))),
        cash_discount_pct = least(99.99, greatest(0, coalesce((p_quote ->> 'cash_discount_pct')::numeric, cash_discount_pct))),
        interest_rate_monthly = greatest(0, coalesce((p_quote ->> 'interest_rate_monthly')::numeric, interest_rate_monthly)),
        notes = coalesce(p_quote ->> 'notes', notes)
    where id = v_quote_id
      and workspace_id = v_workspace_id;

    if not found then
      raise exception 'Orcamento nao encontrado neste workspace.';
    end if;

    delete from public.quote_items where quote_id = v_quote_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.quote_items (
      workspace_id, quote_id, product_id, description, width_m, height_m,
      quantity, material_unit_cost, labor_unit_cost
    )
    values (
      v_workspace_id,
      v_quote_id,
      nullif(v_item ->> 'product_id', '')::uuid,
      coalesce(nullif(trim(v_item ->> 'description'), ''), 'Item'),
      greatest(0, coalesce((v_item ->> 'width_m')::numeric, 0)),
      greatest(0, coalesce((v_item ->> 'height_m')::numeric, 0)),
      greatest(1, coalesce((v_item ->> 'quantity')::integer, 1)),
      greatest(0, coalesce((v_item ->> 'material_unit_cost')::numeric, 0)),
      greatest(0, coalesce((v_item ->> 'labor_unit_cost')::numeric, 0))
    );
  end loop;

  return v_quote_id;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients
for each row execute function private.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers
for each row execute function private.set_updated_at();

drop trigger if exists set_materials_updated_at on public.materials;
create trigger set_materials_updated_at before update on public.materials
for each row execute function private.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function private.set_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at before update on public.quotes
for each row execute function private.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects
for each row execute function private.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at before update on public.team_members
for each row execute function private.set_updated_at();

drop trigger if exists set_installations_updated_at on public.installations;
create trigger set_installations_updated_at before update on public.installations
for each row execute function private.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at before update on public.transactions
for each row execute function private.set_updated_at();

drop trigger if exists log_material_price on public.materials;
create trigger log_material_price
after insert or update of cost on public.materials
for each row execute function private.log_material_price();

drop trigger if exists enforce_workspace_scope on public.materials;
create trigger enforce_workspace_scope before insert or update on public.materials
for each row execute function private.enforce_workspace_scope('suppliers', 'supplier_id');

drop trigger if exists enforce_workspace_scope on public.material_price_history;
create trigger enforce_workspace_scope before insert or update on public.material_price_history
for each row execute function private.enforce_workspace_scope('materials', 'material_id');

drop trigger if exists enforce_workspace_scope on public.client_activities;
create trigger enforce_workspace_scope before insert or update on public.client_activities
for each row execute function private.enforce_workspace_scope('clients', 'client_id', 'team_members', 'responsible_id');

drop trigger if exists enforce_workspace_scope on public.quotes;
create trigger enforce_workspace_scope before insert or update on public.quotes
for each row execute function private.enforce_workspace_scope('clients', 'client_id');

drop trigger if exists enforce_workspace_scope on public.quote_items;
create trigger enforce_workspace_scope before insert or update on public.quote_items
for each row execute function private.enforce_workspace_scope('quotes', 'quote_id', 'products', 'product_id');

drop trigger if exists enforce_workspace_scope on public.projects;
create trigger enforce_workspace_scope before insert or update on public.projects
for each row execute function private.enforce_workspace_scope('clients', 'client_id', 'quotes', 'quote_id', 'team_members', 'installer_id');

drop trigger if exists enforce_workspace_scope on public.installations;
create trigger enforce_workspace_scope before insert or update on public.installations
for each row execute function private.enforce_workspace_scope('projects', 'project_id', 'clients', 'client_id', 'team_members', 'installer_id');

drop trigger if exists enforce_workspace_scope on public.transactions;
create trigger enforce_workspace_scope before insert or update on public.transactions
for each row execute function private.enforce_workspace_scope('clients', 'client_id', 'suppliers', 'supplier_id');

drop trigger if exists quote_items_totals on public.quote_items;
create trigger quote_items_totals
after insert or update or delete on public.quote_items
for each row execute function private.on_quote_item_change();

drop trigger if exists quote_percentages_totals on public.quotes;
create trigger quote_percentages_totals
after update of fixed_cost_pct, margin_pct, tax_pct, cash_discount_pct on public.quotes
for each row execute function private.on_quote_percentages_change();

create or replace view public.v_client_summary
with (security_invoker = true)
as
select
  c.id,
  c.workspace_id,
  c.name,
  c.contact_name,
  c.email,
  c.phone,
  c.status,
  c.lgpd_consent,
  c.lgpd_consent_at,
  c.last_contact_at,
  c.notes,
  c.created_at,
  c.updated_at,
  coalesce(p.project_count, 0)::int as project_count,
  coalesce(p.total_value, 0)::numeric(14, 2) as total_value
from public.clients c
left join (
  select client_id, count(*) as project_count, sum(value) as total_value
  from public.projects
  where status <> 'cancelado'
  group by client_id
) p on p.client_id = c.id;

create or replace view public.v_team_performance
with (security_invoker = true)
as
select
  tm.id,
  tm.workspace_id,
  tm.name,
  tm.phone,
  tm.commission_rate,
  tm.active,
  tm.skills,
  tm.created_at,
  tm.updated_at,
  coalesce(i.installations_count, 0)::int as installations_count,
  coalesce(i.revenue_generated, 0)::numeric(14, 2) as revenue_generated
from public.team_members tm
left join (
  select
    installer_id,
    count(*) filter (where status = 'concluido') as installations_count,
    sum(value) filter (where status = 'concluido') as revenue_generated
  from public.installations
  group by installer_id
) i on i.installer_id = tm.id;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.clients enable row level security;
alter table public.team_members enable row level security;
alter table public.client_activities enable row level security;
alter table public.materials enable row level security;
alter table public.material_price_history enable row level security;
alter table public.products enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.projects enable row level security;
alter table public.installations enable row level security;
alter table public.transactions enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (id = (select auth.uid()) or private.shares_workspace(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
for select to authenticated
using (private.is_workspace_member(id));

drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin on public.workspaces
for update to authenticated
using (private.can_manage_workspace(id))
with check (private.can_manage_workspace(id));

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin on public.workspace_members
for insert to authenticated
with check (private.is_workspace_admin(workspace_id));

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin on public.workspace_members
for update to authenticated
using (private.is_workspace_admin(workspace_id))
with check (private.is_workspace_admin(workspace_id));

drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin on public.workspace_members
for delete to authenticated
using (private.is_workspace_admin(workspace_id));

drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_delete on public.suppliers
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists team_members_update on public.team_members;
create policy team_members_update on public.team_members
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists client_activities_select on public.client_activities;
create policy client_activities_select on public.client_activities
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists client_activities_insert on public.client_activities;
create policy client_activities_insert on public.client_activities
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists client_activities_update on public.client_activities;
create policy client_activities_update on public.client_activities
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists client_activities_delete on public.client_activities;
create policy client_activities_delete on public.client_activities
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists materials_select on public.materials;
create policy materials_select on public.materials
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists materials_insert on public.materials;
create policy materials_insert on public.materials
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists materials_update on public.materials;
create policy materials_update on public.materials
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists materials_delete on public.materials;
create policy materials_delete on public.materials
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists material_price_history_select on public.material_price_history;
create policy material_price_history_select on public.material_price_history
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists material_price_history_insert on public.material_price_history;
create policy material_price_history_insert on public.material_price_history
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists material_price_history_update on public.material_price_history;
create policy material_price_history_update on public.material_price_history
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists material_price_history_delete on public.material_price_history;
create policy material_price_history_delete on public.material_price_history
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists products_select on public.products;
create policy products_select on public.products
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists products_update on public.products;
create policy products_update on public.products
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists products_delete on public.products;
create policy products_delete on public.products
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists quotes_select on public.quotes;
create policy quotes_select on public.quotes
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists quotes_insert on public.quotes;
create policy quotes_insert on public.quotes
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists quotes_update on public.quotes;
create policy quotes_update on public.quotes
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists quotes_delete on public.quotes;
create policy quotes_delete on public.quotes
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists quote_items_select on public.quote_items;
create policy quote_items_select on public.quote_items
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists quote_items_insert on public.quote_items;
create policy quote_items_insert on public.quote_items
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists quote_items_update on public.quote_items;
create policy quote_items_update on public.quote_items
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists quote_items_delete on public.quote_items;
create policy quote_items_delete on public.quote_items
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists installations_select on public.installations;
create policy installations_select on public.installations
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists installations_insert on public.installations;
create policy installations_insert on public.installations
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists installations_update on public.installations;
create policy installations_update on public.installations
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists installations_delete on public.installations;
create policy installations_delete on public.installations
for delete to authenticated
using (private.can_write_workspace(workspace_id));

drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
for select to authenticated
using (private.is_workspace_member(workspace_id));
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
for insert to authenticated
with check (private.can_write_workspace(workspace_id));
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
for update to authenticated
using (private.can_write_workspace(workspace_id))
with check (private.can_write_workspace(workspace_id));
drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
for delete to authenticated
using (private.can_write_workspace(workspace_id));

revoke all on schema private from anon;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.can_write_workspace(uuid) to authenticated;
grant execute on function private.can_manage_workspace(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.shares_workspace(uuid) to authenticated;

revoke all on function public.save_quote(jsonb, jsonb) from public;
grant execute on function public.save_quote(jsonb, jsonb) to authenticated;

revoke all on table
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.suppliers,
  public.clients,
  public.team_members,
  public.client_activities,
  public.materials,
  public.material_price_history,
  public.products,
  public.quotes,
  public.quote_items,
  public.projects,
  public.installations,
  public.transactions
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.client_activities to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.material_price_history to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.installations to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

revoke all on table public.v_client_summary, public.v_team_performance from anon, authenticated;
grant select on public.v_client_summary, public.v_team_performance to authenticated;

insert into public.profiles as p (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.email, '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = case when p.full_name = '' then excluded.full_name else p.full_name end;

notify pgrst, 'reload schema';

commit;
