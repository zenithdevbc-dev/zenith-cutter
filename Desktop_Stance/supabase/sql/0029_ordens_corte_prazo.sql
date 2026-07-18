-- Zenith Cutter — data limite da ordem (opcional), alimenta o KPI
-- "Atrasadas" do Relatório de Produção. Rodar no SQL Editor do painel
-- do Supabase, depois de 0028.

alter table public.ordens_corte
  add column prazo date;
