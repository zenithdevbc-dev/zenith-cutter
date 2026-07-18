-- Zenith Cutter — Sprint 1: Multiempresa (isolamento de dados)
-- Rodar no SQL Editor do painel do Supabase, DEPOIS de 0001_usuarios.sql.
-- Decisão registrada no CLAUDE.md (seção 5, 2026-07-07): o MVP isola
-- dados entre empresas-cliente via RLS. Provisionar empresa nova é
-- operação de backend (ver supabase/functions/create-empresa), não uma
-- tela do app.

-- 1. Tabela de empresas ------------------------------------------------------
create table public.empresas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.empresas enable row level security;

-- 2. usuarios ganha empresa_id ------------------------------------------------
alter table public.usuarios add column empresa_id uuid references public.empresas (id);

-- Backfill: usuarios já existentes (ex.: seu usuário de teste do Sprint 0/1)
-- precisam de uma empresa. Cria uma "empresa padrão" e associa todo mundo
-- que ainda não tem empresa_id. Renomeie depois:
--   update public.empresas set nome = 'Nome real da sua empresa' where nome = 'Empresa Padrão';
insert into public.empresas (nome)
select 'Empresa Padrão'
where not exists (select 1 from public.empresas where nome = 'Empresa Padrão');

update public.usuarios
set empresa_id = (select id from public.empresas where nome = 'Empresa Padrão')
where empresa_id is null;

alter table public.usuarios alter column empresa_id set not null;

create index usuarios_empresa_id_idx on public.usuarios (empresa_id);

-- 3. Perfil criado automaticamente: agora também herda a empresa ------------
-- A Edge Function create-usuario passa empresa_id em user_metadata (o
-- admin chamador já pertence a uma empresa; o novo usuário herda a dele).
-- Sem isso, um insert em auth.users sem metadata não teria como saber a
-- empresa — nesse caso cai no NULL e falha o NOT NULL (proposital: força
-- todo caminho de criação a ser explícito sobre a empresa).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, empresa_id, nome, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Helper de RLS: empresa do usuário autenticado ---------------------------
create function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from public.usuarios where id = auth.uid();
$$;

-- 5. Refaz as policies de usuarios para isolar por empresa -------------------
drop policy if exists "usuarios_select_authenticated" on public.usuarios;
drop policy if exists "usuarios_update_admin_only" on public.usuarios;

create policy "usuarios_select_same_empresa"
  on public.usuarios for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "usuarios_update_admin_same_empresa"
  on public.usuarios for update
  to authenticated
  using (public.is_admin() and empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- 6. RLS de empresas: cada usuário só vê a própria empresa -------------------
create policy "empresas_select_own"
  on public.empresas for select
  to authenticated
  using (id = public.current_empresa_id());

-- Sem policy de insert/update/delete para authenticated/anon: empresa só
-- é criada/alterada pela Edge Function create-empresa (service_role).
