-- Zenith Cutter — pipeline pós-corte (decisão de 2026-07-11)
-- Rodar no SQL Editor do painel do Supabase, depois de 0016.
--
-- Substitui o antigo par "Finalizar → Conferência → Finalizada" (nunca
-- implementado) por 4 etapas mais granulares avançadas manualmente uma
-- de cada vez (seção 4 do CLAUDE.md): Embalagem, Revisão (mesmo papel
-- da antiga "Conferência"), Despacho, Pronto.
alter table public.ordens_corte drop constraint ordens_corte_status_check;
alter table public.ordens_corte add constraint ordens_corte_status_check
  check (status in ('aberta', 'em_fila', 'cancelada', 'em_corte', 'embalagem', 'revisao', 'despacho', 'pronto'));
