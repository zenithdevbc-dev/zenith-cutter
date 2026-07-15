-- Zenith Cutter — Sprint 4: novas ações de auditoria (pausa/retomada)
-- Rodar no SQL Editor do painel do Supabase, depois de 0022.
alter table public.ordem_corte_historico drop constraint ordem_corte_historico_acao_check;
alter table public.ordem_corte_historico add constraint ordem_corte_historico_acao_check
  check (acao in ('criacao', 'edicao', 'mudanca_status', 'cancelamento', 'duplicacao', 'pausa', 'retomada'));
