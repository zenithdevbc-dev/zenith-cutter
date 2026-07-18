-- Zenith Cutter — Sprint 1: Clientes
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- na ordem: 0001_usuarios.sql, 0003_empresas_multi_tenant.sql, este aqui.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Cliente é criado localmente primeiro (offline-first de verdade — sem
-- dependência de Edge Function como em usuarios). O id é o mesmo uuid
-- gerado no app; o Supabase é só o espelho na nuvem.
create table public.clientes (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  nome          text not null,
  documento     text,
  telefone      text,
  email         text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index clientes_nome_idx on public.clientes (nome);
create index clientes_empresa_id_idx on public.clientes (empresa_id);

create trigger clientes_set_atualizado_em
  before update on public.clientes
  for each row execute function public.set_atualizado_em();

alter table public.clientes enable row level security;

-- Cadastro de cliente é operação do dia a dia — qualquer usuário
-- autenticado (operador ou administrador) da MESMA empresa pode ver,
-- criar e editar. with check garante que ninguém grava/move um cliente
-- para fora da própria empresa.
create policy "clientes_select_same_empresa"
  on public.clientes for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "clientes_insert_same_empresa"
  on public.clientes for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "clientes_update_same_empresa"
  on public.clientes for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE: nunca há exclusão física — desativar é
-- UPDATE ativo = false, preservando auditoria e evitando quebrar
-- referências futuras (Ordens de Corte apontando para o cliente).