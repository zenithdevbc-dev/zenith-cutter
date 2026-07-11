-- Zenith Cutter — Sprint 3: acesso do Operador à execução da Produção
-- Rodar no SQL Editor do painel do Supabase, depois de 0016.
-- Fecha o comentário deixado em 0011_add_supervisor_role.sql (linhas
-- 177-181): Operador ganha acesso só à ação de execução "iniciar"
-- (seção 3.6) — nunca à edição da fila em si (reordenar prioridade
-- continua exclusivo de administrador/supervisor).

-- SELECT: Operador só enxerga ordens que já estão na fila ou em
-- produção — nunca 'aberta' (rascunho, ainda gerenciado por
-- administrador/supervisor) nem 'cancelada'.
create policy "ordens_corte_select_operador"
  on public.ordens_corte for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_fila', 'em_corte')
  );

-- UPDATE: Operador só pode mover 'em_fila' -> 'em_corte' (o "Iniciar"
-- de iniciarProducaoLocal), nunca qualquer outra transição nem editar
-- os demais campos da ordem.
create policy "ordens_corte_update_operador_iniciar"
  on public.ordens_corte for update
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status = 'em_fila'
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status = 'em_corte'
  );
