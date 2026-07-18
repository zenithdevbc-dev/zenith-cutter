-- Zenith Cutter — Sprint 3: acesso do Operador à execução da Produção
-- Rodar no SQL Editor do painel do Supabase, depois de 0019 (precisa
-- do pipeline pós-corte completo no CHECK de status).
-- Fecha o comentário deixado em 0011_add_supervisor_role.sql (linhas
-- 177-181): Operador ganha acesso só às ações de execução (seção 3.6:
-- iniciar + avançar etapa) — nunca à edição da fila em si (reordenar
-- prioridade continua exclusivo de administrador/supervisor).

-- SELECT: Operador só enxerga ordens que já estão na fila ou em
-- alguma etapa do pipeline de produção — nunca 'aberta' (rascunho,
-- ainda gerenciado por administrador/supervisor) nem 'cancelada'.
create policy "ordens_corte_select_operador"
  on public.ordens_corte for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_fila', 'em_corte', 'embalagem', 'revisao', 'despacho', 'pronto')
  );

-- UPDATE: Operador só pode avançar a ordem pelo pipeline (iniciar:
-- em_fila -> em_corte; avançar etapa: em_corte -> embalagem -> revisao
-- -> despacho -> pronto), nunca outra transição nem editar os demais
-- campos da ordem. Não garante adjacência estrita de uma etapa por vez
-- só pela policy (isso é aplicado por iniciarProducaoLocal/
-- avancarEtapaOrdemLocal, os únicos caminhos que o app usa) — a policy
-- garante que o Operador nunca sai do pipeline de execução em si.
create policy "ordens_corte_update_operador_pipeline"
  on public.ordens_corte for update
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_fila', 'em_corte', 'embalagem', 'revisao', 'despacho')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_corte', 'embalagem', 'revisao', 'despacho', 'pronto')
  );
