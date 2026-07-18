-- Zenith Cutter — Sprint 4: pausar/retomar dentro de 'Em Corte'
-- Rodar no SQL Editor do painel do Supabase, depois de 0021.
--
-- pausado_em marca o início da pausa atual (NULL fora de pausa);
-- tempo_pausado_segundos acumula o total pausado da sessão (somado a
-- cada retomada), usado pra calcular o tempo de produção efetivo.
alter table public.sessoes_producao add column pausado_em timestamptz;
alter table public.sessoes_producao add column tempo_pausado_segundos integer not null default 0;
