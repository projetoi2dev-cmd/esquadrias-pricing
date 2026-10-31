-- Verificação somente leitura pós-restore do Esquadra.
-- Uso: psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/verify-restore.sql
-- Também pode ser colado no SQL Editor do projeto restaurado.

do $$
declare
  missing text;
begin
  select string_agg(t, ', ') into missing
  from unnest(array[
    'workspaces', 'profiles', 'workspace_members', 'suppliers', 'clients',
    'team_members', 'client_activities', 'materials', 'material_price_history',
    'products', 'quotes', 'quote_items', 'projects', 'installations', 'transactions'
  ]) as t
  where not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = t
  );
  if missing is not null then
    raise exception 'Tabelas ausentes: %', missing;
  end if;
  raise notice 'OK tabelas essenciais';

  select string_agg(tablename, ', ') into missing
  from pg_tables
  where schemaname = 'public' and not rowsecurity;
  if missing is not null then
    raise exception 'RLS desabilitado em: %', missing;
  end if;
  raise notice 'OK RLS habilitado em todas as tabelas public';

  select string_agg(t, ', ') into missing
  from unnest(array[
    'workspaces', 'profiles', 'workspace_members', 'suppliers', 'clients',
    'team_members', 'client_activities', 'materials', 'material_price_history',
    'products', 'quotes', 'quote_items', 'projects', 'installations', 'transactions'
  ]) as t
  where not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = t
  );
  if missing is not null then
    raise exception 'Sem políticas RLS em: %', missing;
  end if;
  raise notice 'OK políticas RLS em todas as tabelas';
end $$;

do $$
declare
  missing text;
begin
  select string_agg(f, ', ') into missing
  from unnest(array[
    'is_workspace_member', 'can_write_workspace', 'can_manage_workspace',
    'is_workspace_admin', 'shares_workspace', 'handle_new_user',
    'recalculate_quote_totals', 'on_quote_item_change', 'on_quote_percentages_change',
    'log_material_price', 'enforce_workspace_scope', 'set_updated_at'
  ]) as f
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = f
  );
  if missing is not null then
    raise exception 'Funções private ausentes: %', missing;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_quote' and p.prosecdef
  ) then
    raise exception 'public.save_quote ausente ou sem security definer';
  end if;
  raise notice 'OK funções e save_quote security definer';

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_projects_quote'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'Índice único idx_projects_quote ausente';
  end if;
  raise notice 'OK índice único de projeto por orçamento';

  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
  ) then
    raise exception 'Trigger on_auth_user_created ausente';
  end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'quote_items' and t.tgname = 'enforce_workspace_scope'
  ) then
    raise exception 'Trigger de escopo ausente em quote_items';
  end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'materials' and t.tgname = 'log_material_price'
  ) then
    raise exception 'Trigger log_material_price ausente em materials';
  end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'quote_items' and t.tgname = 'quote_items_totals'
  ) then
    raise exception 'Trigger quote_items_totals ausente';
  end if;
  raise notice 'OK triggers essenciais';
end $$;

do $$
declare
  v_count integer;
begin
  if not has_table_privilege('authenticated', 'public.workspaces', 'SELECT') then
    raise exception 'authenticated sem SELECT em public.workspaces';
  end if;

  if has_table_privilege('anon', 'public.workspaces', 'SELECT') then
    raise exception 'anon não deveria ter SELECT em public.workspaces';
  end if;

  if not has_function_privilege('authenticated', 'public.save_quote(jsonb,jsonb)', 'EXECUTE') then
    raise exception 'authenticated sem EXECUTE em public.save_quote';
  end if;

  if has_function_privilege('anon', 'public.save_quote(jsonb,jsonb)', 'EXECUTE') then
    raise exception 'anon não deveria executar public.save_quote';
  end if;
  raise notice 'OK grants de authenticated/anon';

  select count(*) into v_count from public.workspaces;
  if v_count = 0 then
    raise exception 'Nenhum workspace no banco restaurado';
  end if;

  select count(*) into v_count from public.profiles;
  if v_count = 0 then
    raise exception 'Nenhum profile no banco restaurado';
  end if;

  select count(*) into v_count from public.workspace_members;
  if v_count = 0 then
    raise exception 'Nenhum workspace_member no banco restaurado';
  end if;

  select count(*) into v_count from public.workspace_members where role = 'admin';
  if v_count = 0 then
    raise exception 'Nenhum admin no workspace restaurado';
  end if;

  select count(*) into v_count
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null;
  if v_count > 0 then
    raise exception '% usuário(s) do Auth sem profile', v_count;
  end if;

  select count(*) into v_count
  from public.workspace_members wm
  left join auth.users u on u.id = wm.user_id
  where u.id is null;
  if v_count > 0 then
    raise exception '% vínculo(s) de workspace sem usuário no Auth', v_count;
  end if;
  raise notice 'OK Auth, profiles e vínculos de workspace';
end $$;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.quote_items qi
  join public.quotes q on q.id = qi.quote_id
  where qi.workspace_id <> q.workspace_id;
  if v_count > 0 then
    raise exception '% item(ns) de orçamento com workspace divergente', v_count;
  end if;

  select count(*) into v_count
  from public.projects p
  join public.quotes q on q.id = p.quote_id
  where p.workspace_id <> q.workspace_id;
  if v_count > 0 then
    raise exception '% projeto(s) com workspace divergente do orçamento', v_count;
  end if;

  select count(*) into v_count
  from (
    select quote_id
    from public.projects
    where quote_id is not null
    group by quote_id
    having count(*) > 1
  ) duplicated;
  if v_count > 0 then
    raise exception '% orçamento(s) com mais de um projeto', v_count;
  end if;
  raise notice 'OK integridade de escopo e unicidade';

  raise notice 'Contagens: workspaces=%, profiles=%, members=%, clients=%, suppliers=%, materials=%, products=%, quotes=%, quote_items=%, projects=%, installations=%, transactions=%',
    (select count(*) from public.workspaces),
    (select count(*) from public.profiles),
    (select count(*) from public.workspace_members),
    (select count(*) from public.clients),
    (select count(*) from public.suppliers),
    (select count(*) from public.materials),
    (select count(*) from public.products),
    (select count(*) from public.quotes),
    (select count(*) from public.quote_items),
    (select count(*) from public.projects),
    (select count(*) from public.installations),
    (select count(*) from public.transactions);
  raise notice 'verify-restore: todas as verificações passaram';
end $$;
