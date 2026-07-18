-- Zenith Cutter — pré-atribuição de mesa na fila de produção (menu
-- da mesa mostra a fila atribuída a ela). Rodar no SQL Editor do
-- painel do Supabase, depois de 0027.

alter table public.ordens_corte
  add column mesa_atribuida_id uuid references public.mesas_corte (id);

create index ordens_corte_mesa_atribuida_id_idx
  on public.ordens_corte (mesa_atribuida_id);
