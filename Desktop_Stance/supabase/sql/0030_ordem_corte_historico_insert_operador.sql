-- Zenith Cutter — correção de auditoria: Operador registrando histórico
-- Rodar no SQL Editor do painel do Supabase, depois de 0014 e 0020.
--
-- Bug encontrado em auditoria: 0014 só permitia INSERT em
-- ordem_corte_historico para administrador/supervisor, mas
-- registrarHistorico() (electron/main/db/repositories/producao.ts) é
-- chamado também para ações de Operador (iniciar produção, avançar
-- etapa, pausar, retomar — CLAUDE.md 3.6, Produção é acessível ao
-- Operador). Toda entrada de histórico criada por um Operador ficava
-- presa local, esgotava as 5 tentativas de sync e virava erro
-- permanente — a maior parte da atividade real do chão de fábrica
-- nunca chegava na cópia auditável do Supabase (quebra 3.5).
--
-- SELECT continua restrito a administrador/supervisor (a tela que
-- exibe o histórico, dentro de Ordens de Corte, já é exclusiva desses
-- papéis — Operador nunca precisa ler de volta, só escrever).
drop policy "ordem_corte_historico_insert_same_empresa" on public.ordem_corte_historico;

create policy "ordem_corte_historico_insert_same_empresa"
  on public.ordem_corte_historico for insert
  to authenticated
  with check (
    empresa_id = public.current_empresa_id()
    and public.current_papel() in ('administrador', 'supervisor', 'operador')
  );
