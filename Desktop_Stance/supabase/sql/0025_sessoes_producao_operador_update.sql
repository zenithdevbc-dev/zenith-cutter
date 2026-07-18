-- Zenith Cutter — Sprint 4: Operador ganha UPDATE em sessoes_producao
-- Rodar no SQL Editor do painel do Supabase, depois de 0024.
--
-- Faltava desde a 0017 (Sprint 3): Operador só tinha INSERT+SELECT.
-- Agora pausar/retomar (Sprint 4) e o "avançar etapa" que finaliza a
-- sessão ao sair de em_corte (Sprint 3) fazem UPDATE em
-- sessoes_producao, e Operador precisa poder chamar essas ações
-- (CLAUDE.md 3.6: Produção/execução é acessível ao Operador).
create policy "sessoes_producao_update_operador"
  on public.sessoes_producao for update
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_andamento', 'pausada')
  )
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_papel() = 'operador'
    and status in ('em_andamento', 'pausada', 'finalizada')
  );
