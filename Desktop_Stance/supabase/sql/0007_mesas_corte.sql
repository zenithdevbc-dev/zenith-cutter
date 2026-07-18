-- Zenith Cutter — Sprint 1: Mesas de Corte
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- na ordem: 0001_usuarios.sql, 0003_empresas_multi_tenant.sql, este aqui.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Cadastro (Sprint 1) das mesas físicas de corte que existem na
-- fábrica. Estado de ocupação (livre/ocupada) é conceito da Fila de
-- Produção (Sprint 3) — não faz parte deste cadastro, que só registra
-- quais mesas existem. Mesma regra de offline-first de
-- clientes/produtos/tecidos: id gerado no app, Supabase é só o espelho.
create table public.mesas_corte (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  nome          text not null,
  observacoes   text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index mesas_corte_nome_idx on public.mesas_corte (nome);
create index mesas_corte_empresa_id_idx on public.mesas_corte (empresa_id);

create trigger mesas_corte_set_atualizado_em
  before update on public.mesas_corte
  for each row execute function public.set_atualizado_em();

alter table public.mesas_corte enable row level security;

-- Cadastro de mesa é operação do dia a dia — qualquer usuário
-- autenticado (operador ou administrador) da MESMA empresa pode ver,
-- criar e editar. with check garante que ninguém grava/move uma mesa
-- para fora da própria empresa.
create policy "mesas_corte_select_same_empresa"
  on public.mesas_corte for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "mesas_corte_insert_same_empresa"
  on public.mesas_corte for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "mesas_corte_update_same_empresa"
  on public.mesas_corte for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE: nunca há exclusão física — desativar é
-- UPDATE ativo = false, preservando auditoria e evitando quebrar
-- referências futuras (sessões de produção apontando para a mesa).
