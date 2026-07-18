-- Zenith Cutter — Sprint 3: sessões de produção
-- Rodar no SQL Editor do painel do Supabase, depois de 0011 (precisa
-- de current_papel()), 0016 (precisa do status 'em_corte' de
-- ordens_corte) e 0007 (mesas_corte).
--
-- Criada ao "Iniciar" (seleção manual de mesa livre + confirmação —
-- regra 3.1, nunca automático). status já inclui os 3 valores da
-- state machine da seção 4 do CLAUDE.md, mas este sprint só produz
-- 'em_andamento'; 'pausada'/'finalizada' chegam no Sprint 4.
create table public.sessoes_producao (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  ordem_id      uuid not null references public.ordens_corte (id),
  mesa_id       uuid not null references public.mesas_corte (id),
  status        text not null default 'em_andamento' check (status in ('em_andamento', 'pausada', 'finalizada')),
  iniciado_por  uuid not null references public.usuarios (id),
  iniciado_em   timestamptz not null default now(),
  finalizado_em timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index sessoes_producao_empresa_id_idx on public.sessoes_producao (empresa_id);
create index sessoes_producao_ordem_id_idx on public.sessoes_producao (ordem_id);

-- Garantia no banco (não só validação de app) de que uma mesa nunca
-- tem duas sessões ativas ao mesmo tempo, e que uma ordem não é
-- iniciada duas vezes — mesmo espírito do UNIQUE(empresa_id, numero)
-- de ordens_corte.
create unique index sessoes_producao_mesa_ativa_idx on public.sessoes_producao (mesa_id) where status = 'em_andamento';
create unique index sessoes_producao_ordem_ativa_idx on public.sessoes_producao (ordem_id) where status = 'em_andamento';

create trigger sessoes_producao_set_atualizado_em
  before update on public.sessoes_producao
  for each row execute function public.set_atualizado_em();

alter table public.sessoes_producao enable row level security;

-- Administrador/supervisor: acesso completo (mesma regra de
-- ordens_corte/fila de produção — quem gerencia a fila também
-- enxerga/gerencia as sessões).
create policy "sessoes_producao_select_admin_supervisor"
  on public.sessoes_producao for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "sessoes_producao_insert_admin_supervisor"
  on public.sessoes_producao for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "sessoes_producao_update_admin_supervisor"
  on public.sessoes_producao for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

-- Operador: só as ações de execução (seção 3.6) — pode iniciar
-- (INSERT) e ver as sessões da própria empresa, mas não UPDATE ainda
-- (pausar/retomar/finalizar são Sprint 4, quando a policy de UPDATE
-- ganha as regras certas de transição).
create policy "sessoes_producao_select_operador"
  on public.sessoes_producao for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() = 'operador');

create policy "sessoes_producao_insert_operador"
  on public.sessoes_producao for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() = 'operador' and iniciado_por = auth.uid());
