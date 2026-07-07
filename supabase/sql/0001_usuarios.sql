-- Zenith Cutter — Sprint 1: Usuários
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor).
-- Idempotente o suficiente para rodar uma vez em cada ambiente; não rode
-- duas vezes no mesmo projeto sem revisar (create table/policy falham se
-- já existirem).

-- 1. Tabela de perfis de usuário -------------------------------------------
-- id é o mesmo uuid do auth.users: todo usuário do sistema tem uma conta
-- de autenticação; não existe "usuario" sem login (ver create-usuario).
create table public.usuarios (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null,
  email         text not null,
  papel         text not null default 'operador' check (papel in ('operador', 'administrador')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 2. Perfil criado automaticamente junto com a conta -----------------------
-- Cobre tanto a criação via Edge Function quanto qualquer conta criada
-- manualmente no painel (ex.: o usuário de teste do Sprint 0) — sem isso,
-- uma conta de auth sem linha correspondente aqui quebraria o app.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 3. Atualiza atualizado_em automaticamente em qualquer UPDATE -------------
create function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger usuarios_set_atualizado_em
  before update on public.usuarios
  for each row execute function public.set_atualizado_em();

-- 4. Helper para RLS: checa se o usuário autenticado é administrador ------
-- security definer é necessário pra não recair em recursão de RLS (a
-- própria policy de SELECT chamaria esta função, que consulta a mesma
-- tabela — precisa rodar com privilégio elevado, ignorando RLS).
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and papel = 'administrador' and ativo = true
  );
$$;

-- 5. Row Level Security -----------------------------------------------------
alter table public.usuarios enable row level security;

-- Qualquer usuário autenticado pode ver o roster (necessário pra listas,
-- atribuição de operador em sessão de produção, autoria em auditoria etc.)
create policy "usuarios_select_authenticated"
  on public.usuarios for select
  to authenticated
  using (true);

-- Só administradores editam perfis (nome, papel, ativo/inativo).
create policy "usuarios_update_admin_only"
  on public.usuarios for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sem policy de INSERT: só a Edge Function create-usuario (service_role,
-- que ignora RLS) pode criar. Sem policy de DELETE: nunca existe exclusão
-- física — desativar é UPDATE ativo = false, preservando a auditoria.

-- 6. Backfill de contas criadas ANTES deste script ---------------------------
-- O trigger só dispara em INSERTs novos em auth.users. Isso cobre o
-- usuário de teste do Sprint 0 (e qualquer outro criado manualmente antes
-- de rodar este arquivo), senão ele fica sem linha em usuarios e o app
-- quebra ao tentar ler o perfil dele.
insert into public.usuarios (id, nome, email)
select id, coalesce(raw_user_meta_data->>'nome', email), email
from auth.users
on conflict (id) do nothing;

-- IMPORTANTE: rode manualmente depois (substituindo o e-mail) para o seu
-- usuário de teste virar administrador — sem isso, ninguém consegue criar
-- novos usuários pela tela (a Edge Function exige papel = 'administrador'):
--
--   update public.usuarios set papel = 'administrador' where email = 'SEU_EMAIL_DE_TESTE_AQUI';
