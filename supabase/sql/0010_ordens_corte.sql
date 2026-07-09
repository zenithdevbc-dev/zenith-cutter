-- Zenith Cutter — Sprint 2: Ordens de Corte
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- na ordem: 0001_usuarios.sql, 0003_empresas_multi_tenant.sql,
-- 0002_clientes.sql, 0004_produtos.sql, 0006_tecidos.sql,
-- 0008_produto_tamanhos.sql, este aqui.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Status aqui é só o que existe ANTES de entrar na Fila de Produção
-- (Sprint 3) — os estados de execução (Em Corte, Pausada, Finalizada...)
-- chegam junto com a fila. Offline-first: id gerado no app.
create table public.ordens_corte (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  cliente_id    uuid not null references public.clientes (id),
  produto_id    uuid not null references public.produtos (id),
  tecido_id     uuid not null references public.tecidos (id),
  status        text not null default 'aberta' check (status in ('aberta', 'em_fila', 'cancelada')),
  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index ordens_corte_empresa_id_idx on public.ordens_corte (empresa_id);
create index ordens_corte_status_idx on public.ordens_corte (status);

create trigger ordens_corte_set_atualizado_em
  before update on public.ordens_corte
  for each row execute function public.set_atualizado_em();

alter table public.ordens_corte enable row level security;

create policy "ordens_corte_select_same_empresa"
  on public.ordens_corte for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "ordens_corte_insert_same_empresa"
  on public.ordens_corte for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "ordens_corte_update_same_empresa"
  on public.ordens_corte for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Quantidade por tamanho da grade do produto escolhido. Editar itens de
-- uma ordem = apagar e regravar tudo (ver ordensCorte.ts) — nunca há
-- DELETE físico da ordem em si, só dos itens ao reeditar a grade.
create table public.ordem_corte_itens (
  id                 uuid primary key,
  empresa_id         uuid not null references public.empresas (id),
  ordem_id           uuid not null references public.ordens_corte (id) on delete cascade,
  produto_tamanho_id uuid not null references public.produto_tamanhos (id),
  quantidade         integer not null check (quantidade > 0)
);

create index ordem_corte_itens_ordem_id_idx on public.ordem_corte_itens (ordem_id);
create index ordem_corte_itens_empresa_id_idx on public.ordem_corte_itens (empresa_id);

alter table public.ordem_corte_itens enable row level security;

create policy "ordem_corte_itens_select_same_empresa"
  on public.ordem_corte_itens for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "ordem_corte_itens_insert_same_empresa"
  on public.ordem_corte_itens for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "ordem_corte_itens_delete_same_empresa"
  on public.ordem_corte_itens for delete
  to authenticated
  using (empresa_id = public.current_empresa_id());
