-- Zenith Cutter — Sprint 4: registro de perdas e observações
-- Rodar no SQL Editor do painel do Supabase, depois de 0025.
-- Depende de public.current_empresa_id() (0003) e current_papel() (0011).

-- Log cronológico, imutável (só INSERT) — mesmo padrão de
-- ordem_corte_historico. quantidade é livre (sem unidade fixa; o
-- motivo descreve o que foi perdido, ex.: "2.5m de tecido rasgado").
create table public.producao_perdas (
  id          uuid primary key,
  empresa_id  uuid not null references public.empresas (id),
  sessao_id   uuid not null references public.sessoes_producao (id) on delete cascade,
  quantidade  numeric not null check (quantidade > 0),
  motivo      text,
  usuario_id  uuid not null references public.usuarios (id),
  criado_em   timestamptz not null default now()
);

create index producao_perdas_sessao_id_idx on public.producao_perdas (sessao_id);
create index producao_perdas_empresa_id_idx on public.producao_perdas (empresa_id);

alter table public.producao_perdas enable row level security;

create policy "producao_perdas_select_same_empresa"
  on public.producao_perdas for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "producao_perdas_insert_same_empresa"
  on public.producao_perdas for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

-- Observação diferente do campo estático ordens_corte.observacoes —
-- é um log cronológico de notas feitas durante a produção.
create table public.producao_observacoes (
  id          uuid primary key,
  empresa_id  uuid not null references public.empresas (id),
  sessao_id   uuid not null references public.sessoes_producao (id) on delete cascade,
  texto       text not null,
  usuario_id  uuid not null references public.usuarios (id),
  criado_em   timestamptz not null default now()
);

create index producao_observacoes_sessao_id_idx on public.producao_observacoes (sessao_id);
create index producao_observacoes_empresa_id_idx on public.producao_observacoes (empresa_id);

alter table public.producao_observacoes enable row level security;

create policy "producao_observacoes_select_same_empresa"
  on public.producao_observacoes for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "producao_observacoes_insert_same_empresa"
  on public.producao_observacoes for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());
