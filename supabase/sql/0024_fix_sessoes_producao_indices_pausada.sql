-- Zenith Cutter — corrige índices únicos de sessoes_producao
-- Rodar no SQL Editor do painel do Supabase, depois de 0023.
--
-- Bug encontrado ao implementar pausar/retomar: os índices únicos só
-- cobriam status='em_andamento', então uma sessão pausada não
-- bloqueava a mesa/ordem contra um novo "Iniciar" — mas pausar não
-- libera a mesa (a peça continua fisicamente na mesa, só o corte
-- parou). Recria os índices cobrindo 'em_andamento' e 'pausada'.
drop index if exists public.sessoes_producao_mesa_ativa_idx;
drop index if exists public.sessoes_producao_ordem_ativa_idx;

create unique index sessoes_producao_mesa_ativa_idx on public.sessoes_producao (mesa_id) where status in ('em_andamento', 'pausada');
create unique index sessoes_producao_ordem_ativa_idx on public.sessoes_producao (ordem_id) where status in ('em_andamento', 'pausada');
