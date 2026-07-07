-- Zenith Cutter — Sprint 1: Clientes
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor).
-- Depende de 0001_usuarios.sql já ter rodado (reusa a função
-- public.set_atualizado_em() definida lá).

-- Cliente é criado localmente primeiro (offline-first de verdade — sem
-- dependência de Edge Function como em usuarios). O id é o mesmo uuid
-- gerado no app; o Supabase é só o espelho na nuvem.
create table public.clientes (
  id            uuid primary key,
  nome          text not null,
  documento     text,
  telefone      text,
  email         text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index clientes_nome_idx on public.clientes (nome);

create trigger clientes_set_atualizado_em
  before update on public.clientes
  for each row execute function public.set_atualizado_em();

alter table public.clientes enable row level security;

-- Cadastro de cliente é operação do dia a dia — qualquer usuário
-- autenticado (operador ou administrador) pode ver, criar e editar.
create policy "clientes_select_authenticated"
  on public.clientes for select
  to authenticated
  using (true);

create policy "clientes_insert_authenticated"
  on public.clientes for insert
  to authenticated
  with check (true);

create policy "clientes_update_authenticated"
  on public.clientes for update
  to authenticated
  using (true)
  with check (true);

-- Sem policy de DELETE: nunca há exclusão física — desativar é
-- UPDATE ativo = false, preservando auditoria e evitando quebrar
-- referências futuras (Ordens de Corte apontando para o cliente).
