-- Zenith Cutter — restringe bancas (Terceiros) a administrador/supervisor
-- Rodar no SQL Editor do Supabase, depois de 0034_bancas.sql (cria a
-- tabela e as policies atuais) e 0011_add_supervisor_role.sql (precisa
-- de public.current_papel()).
--
-- Decisão de 2026-07-26: 0034 deu a bancas o mesmo tratamento de
-- "cadastro do dia a dia" que tecidos/mesas_corte tinham ANTES de
-- 0011 — isolamento por empresa_id, sem checagem de papel — mas
-- 0011 já havia fechado esse acesso pra clientes/produtos/tecidos/
-- mesas_corte/produto_tamanhos (Operador só executa produção, não
-- gerencia cadastro). Bancas ficou como a única exceção. Fecha essa
-- lacuna aqui, com a mesma regra e o mesmo padrão SQL que 0011 usou
-- pras outras 5 tabelas.
--
-- Mudança de comportamento real: um Operador que hoje consegue
-- ler/gravar Bancas via chamada direta à API do Supabase deixa de
-- conseguir depois desta migration. Nenhuma tela hoje depende disso
-- pra Operador (nem no desktop, nem no mobile) — a única leitura de
-- bancas em código voltado a Operador é o card "Terceiros" do
-- Dashboard, que já precisa (e vai ganhar, no mobile) do mesmo gate
-- `podeVerOrdens` (administrador/supervisor) usado pra Ordens de
-- Corte, então não há regressão visível de UI.
drop policy if exists "bancas_select_same_empresa" on public.bancas;
drop policy if exists "bancas_insert_same_empresa" on public.bancas;
drop policy if exists "bancas_update_same_empresa" on public.bancas;

create policy "bancas_select_same_empresa"
  on public.bancas for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "bancas_insert_same_empresa"
  on public.bancas for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "bancas_update_same_empresa"
  on public.bancas for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

-- Sem policy de DELETE (inalterado desde 0034): nunca há exclusão
-- física de banca.
