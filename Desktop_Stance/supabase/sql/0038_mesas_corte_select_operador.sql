-- Zenith Cutter — libera SELECT de mesas_corte para o papel Operador
-- Rodar no SQL Editor do Supabase (Database > SQL Editor), depois de
-- 0011_add_supervisor_role.sql (que criou a policy atual, restrita a
-- administrador/supervisor, e o helper public.current_papel()).
--
-- Decisão de 2026-07-26 (expansão do módulo mobile): a tela de
-- Produção do Mobile_Stance consulta o Supabase direto (sem cache
-- local/SQLite, diferente do desktop) para montar o seletor de mesa
-- livre ao iniciar produção — uma ação que já é exclusiva de Operador
-- em Produção (CLAUDE.md 3.1/3.6). A policy criada em 0011 bloqueava
-- justamente essa leitura pro papel Operador, quebrando o fluxo no
-- mobile (no desktop isso nunca apareceu porque o cache SQLite local
-- de mesas_corte já chega via sync de outro papel na mesma máquina,
-- então Operador nunca precisou ler a tabela direto do Supabase).
--
-- Escopo: só SELECT muda aqui. INSERT/UPDATE (cadastro de mesas,
-- criadas em 0011) continuam exclusivos de administrador/supervisor —
-- Operador deve poder ler pra escolher uma mesa livre, mas não
-- criar/editar o cadastro da mesa.
drop policy if exists "mesas_corte_select_same_empresa" on public.mesas_corte;

create policy "mesas_corte_select_same_empresa"
  on public.mesas_corte for select
  to authenticated
  using (empresa_id = public.current_empresa_id());
