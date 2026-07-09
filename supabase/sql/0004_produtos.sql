-- Zenith Cutter — Sprint 1: Produtos
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- na ordem: 0001_usuarios.sql, 0003_empresas_multi_tenant.sql, este aqui.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Produto é criado localmente primeiro (offline-first de verdade — sem
-- dependência de Edge Function, mesmo padrão de clientes). O id é o
-- mesmo uuid gerado no app; o Supabase é só o espelho na nuvem.
create table public.produtos (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  nome          text not null,
  codigo        text,
  descricao     text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index produtos_nome_idx on public.produtos (nome);
create index produtos_empresa_id_idx on public.produtos (empresa_id);

create trigger produtos_set_atualizado_em
  before update on public.produtos
  for each row execute function public.set_atualizado_em();

alter table public.produtos enable row level security;

-- Cadastro de produto é operação do dia a dia — qualquer usuário
-- autenticado (operador ou administrador) da MESMA empresa pode ver,
-- criar e editar. with check garante que ninguém grava/move um produto
-- para fora da própria empresa.
create policy "produtos_select_same_empresa"
  on public.produtos for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "produtos_insert_same_empresa"
  on public.produtos for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "produtos_update_same_empresa"
  on public.produtos for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE: nunca há exclusão física — desativar é
-- UPDATE ativo = false, preservando auditoria e evitando quebrar
-- referências futuras (Ordens de Corte apontando para o produto).
