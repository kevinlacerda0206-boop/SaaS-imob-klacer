-- current_account_id() consulta a própria tabela profiles, que é protegida
-- por uma policy que depende de current_account_id() — isso criava recursão
-- e fazia a leitura do próprio perfil falhar (RLS nunca resolvia). A função
-- precisa ser SECURITY DEFINER para ignorar RLS nessa consulta interna.
create or replace function current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from profiles where id = auth.uid()
$$;
