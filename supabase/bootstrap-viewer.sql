-- Esquadra / Supabase bootstrap do visualizador
-- 1. Crie o usuario teste@esquadra.com em Authentication > Users no dashboard do Supabase.
-- 2. Execute este arquivo no SQL Editor do Supabase.
-- O script vincula o usuario ao workspace como visualizador (somente leitura).
-- Se nenhuma linha for afetada, confira o e-mail e o slug do workspace.

begin;

insert into public.profiles as p (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.email, '')
from auth.users u
where u.email = 'teste@esquadra.com'
on conflict (id) do update
  set email = excluded.email,
      full_name = case when p.full_name = '' then excluded.full_name else p.full_name end;

insert into public.workspace_members (workspace_id, user_id, role)
select
  w.id,
  u.id,
  'visualizador'
from public.workspaces w
join auth.users u on u.email = 'teste@esquadra.com'
where w.slug = 'vidracaria-modelo'
on conflict (workspace_id, user_id) do update set role = 'visualizador';

notify pgrst, 'reload schema';

commit;
