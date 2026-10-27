-- Esquadra / Supabase bootstrap
-- Execute depois de schema.sql, seed.sql e da criacao do usuario admin em Authentication > Users.
-- Adiciona o primeiro usuario autenticado como administrador do workspace.

begin;

insert into public.profiles as p (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.email, '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = case when p.full_name = '' then excluded.full_name else p.full_name end;

insert into public.workspace_members (workspace_id, user_id, role)
select
  w.id,
  u.id,
  'admin'
from public.workspaces w
join lateral (
  select id
  from auth.users
  order by created_at asc
  limit 1
) u on true
where w.slug = 'vidracaria-modelo'
on conflict (workspace_id, user_id) do update set role = 'admin';

notify pgrst, 'reload schema';

commit;
