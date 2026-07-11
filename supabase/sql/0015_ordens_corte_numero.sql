-- Zenith Cutter — número sequencial de Ordem de Corte (pedido 2026-07-09)
-- Rodar no SQL Editor do painel do Supabase, depois de 0010_ordens_corte.sql.
--
-- Sugerido automaticamente no app (maior número + 1 da própria
-- empresa), editável na criação, imutável depois. Nunca pode repetir
-- dentro da mesma empresa — daí o UNIQUE(empresa_id, numero), não só
-- validação de app.

alter table public.ordens_corte add column numero integer;

-- Backfill das ordens já existentes: numera por empresa, na ordem de
-- criação (mesmo critério da migration local v13).
update public.ordens_corte oc
set numero = sub.rn
from (
  select id, row_number() over (partition by empresa_id order by criado_em asc) as rn
  from public.ordens_corte
) sub
where sub.id = oc.id;

alter table public.ordens_corte alter column numero set not null;
alter table public.ordens_corte add constraint ordens_corte_empresa_numero_unique unique (empresa_id, numero);
