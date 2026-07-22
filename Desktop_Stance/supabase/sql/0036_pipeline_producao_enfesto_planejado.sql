-- Zenith Cutter — reajuste do pipeline de produção (decisão de 2026-07-21)
-- Rodar no SQL Editor do painel do Supabase, depois de 0032.
--
-- Novo desenho (seção 4 do CLAUDE.md): Planejado - Em Fila - Enfesto -
-- Corte - Embalagem - Despache.
--   - 'planejado' substitui 'aberta' como status inicial da ordem —
--     reverte a decisão de 2026-07-11 que fazia a ordem entrar direto
--     em 'em_fila'; agora precisa de uma ação manual de
--     administrador/supervisor (Editar > Status) pra ir pra fila.
--   - 'enfesto' é uma etapa nova antes do corte, na mesma mesa física
--     (a mesa fica ocupada por 'enfesto' e 'corte' juntos — mesma
--     sessão de produção — e só libera saindo de 'corte').
--   - 'em_corte' vira 'corte'.
--   - 'revisao' sai do pipeline.
--   - 'despacho' (rótulo "Despache" no app) continua a última etapa
--     ativa; avançar dela marca a ordem como 'pronto', igual já
--     funcionava.
--
-- Backfill roda com a constraint solta (nenhuma linha em produção usa
-- 'aberta'/'em_corte'/'revisao' hoje, conferido antes de escrever esta
-- migration, mas o backfill fica por segurança/outras empresas).
alter table public.ordens_corte drop constraint ordens_corte_status_check;

update public.ordens_corte set status = 'planejado' where status = 'aberta';
update public.ordens_corte set status = 'corte' where status = 'em_corte';
update public.ordens_corte set status = 'despacho' where status = 'revisao';

alter table public.ordens_corte alter column status set default 'planejado';
alter table public.ordens_corte add constraint ordens_corte_status_check
  check (status in ('planejado', 'em_fila', 'cancelada', 'enfesto', 'corte', 'embalagem', 'despacho', 'pronto'));

-- RLS do Operador (0020_ordens_corte_operador_producao.sql) enumera os
-- status literalmente — precisa acompanhar o novo pipeline. Segue
-- nunca enxergando 'planejado' (equivalente ao antigo 'aberta', fora
-- do alcance do Operador) nem 'cancelada'.
drop policy if exists "ordens_corte_select_operador" on public.ordens_corte;
create policy "ordens_corte_select_operador"
  on public.ordens_corte for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_fila', 'enfesto', 'corte', 'embalagem', 'despacho', 'pronto')
  );

drop policy if exists "ordens_corte_update_operador_pipeline" on public.ordens_corte;
create policy "ordens_corte_update_operador_pipeline"
  on public.ordens_corte for update
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_fila', 'enfesto', 'corte', 'embalagem', 'despacho')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('enfesto', 'corte', 'embalagem', 'despacho', 'pronto')
  );
