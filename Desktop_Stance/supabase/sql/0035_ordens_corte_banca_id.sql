-- Zenith Cutter — Módulo Bancas: vínculo opcional na Ordem de Corte
-- Rodar no SQL Editor do painel do Supabase, depois de 0034_bancas.sql.

-- Sem banca vinculada = produção interna (comportamento já existente
-- antes desta coluna, nada muda pras ordens atuais). Não participa da
-- state machine de status (regra 4 do CLAUDE.md) — é só um dado
-- descritivo, por isso nenhuma policy de ordens_corte precisa mudar.
alter table public.ordens_corte
  add column banca_id uuid references public.bancas (id);

create index ordens_corte_banca_id_idx on public.ordens_corte (banca_id);
