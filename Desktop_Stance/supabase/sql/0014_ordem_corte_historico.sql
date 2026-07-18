-- Zenith Cutter — Sprint 2: histórico dedicado de Ordens de Corte
-- Rodar no SQL Editor do painel do Supabase, depois de 0010_ordens_corte.sql
-- e 0011_add_supervisor_role.sql (precisa de current_empresa_id(),
-- current_papel() e da tabela ordens_corte).
--
-- Auditoria (CLAUDE.md 3.5): toda ação relevante fica registrada com
-- usuário + timestamp + ação. Tabela imutável — só INSERT, nunca
-- UPDATE/DELETE (sem policy pra isso de propósito).
create table public.ordem_corte_historico (
  id         uuid primary key,
  empresa_id uuid not null references public.empresas (id),
  ordem_id   uuid not null references public.ordens_corte (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id),
  acao       text not null check (acao in ('criacao', 'edicao', 'mudanca_status', 'cancelamento', 'duplicacao')),
  descricao  text not null,
  criado_em  timestamptz not null default now()
);

create index ordem_corte_historico_ordem_id_idx on public.ordem_corte_historico (ordem_id);
create index ordem_corte_historico_empresa_id_idx on public.ordem_corte_historico (empresa_id);

alter table public.ordem_corte_historico enable row level security;

-- Mesma regra de acesso de ordens_corte: administrador/supervisor,
-- nunca operador (seção 3.6).
create policy "ordem_corte_historico_select_same_empresa"
  on public.ordem_corte_historico for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "ordem_corte_historico_insert_same_empresa"
  on public.ordem_corte_historico for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));
