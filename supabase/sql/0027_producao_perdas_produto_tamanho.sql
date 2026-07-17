-- Zenith Cutter — perda registrada por tamanho da grade do produto
-- (mesmo formato de grid da criação de ordem), não mais como valor
-- livre solto. Rodar no SQL Editor do painel do Supabase, depois de 0026.

alter table public.producao_perdas
  add column produto_tamanho_id uuid references public.produto_tamanhos (id);

create index producao_perdas_produto_tamanho_id_idx
  on public.producao_perdas (produto_tamanho_id);
