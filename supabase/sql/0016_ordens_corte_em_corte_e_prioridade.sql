-- Zenith Cutter — Sprint 3: Fila de Produção
-- Rodar no SQL Editor do painel do Supabase, depois de 0010, 0011, 0015.

-- Novo status 'em_corte' (ordem com sessão de produção ativa — só
-- setado ao iniciar a produção, nunca por edição livre, ver
-- updateOrdemCorteLocal) e coluna 'prioridade' (ordena a fila
-- manualmente, mesmo padrão de produto_tamanhos.ordem).
alter table public.ordens_corte drop constraint ordens_corte_status_check;
alter table public.ordens_corte add constraint ordens_corte_status_check
  check (status in ('aberta', 'em_fila', 'cancelada', 'em_corte'));

alter table public.ordens_corte add column prioridade integer not null default 0;
