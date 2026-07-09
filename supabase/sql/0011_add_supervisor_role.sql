-- Zenith Cutter — novo papel "Supervisor" + matriz de permissões
-- Rodar no SQL Editor do painel do Supabase, depois de 0001, 0002,
-- 0003, 0004, 0006, 0007, 0008, 0010 (precisa de current_empresa_id()
-- de 0003 e de todas as tabelas cujas policies são reescritas aqui).
--
-- Decisão de 2026-07-09:
--   Administrador: acesso total.
--   Supervisor: Dashboard, Cadastros (Clientes/Produtos/Tecidos/Mesas
--     — NÃO Usuários), Ordens de Corte, Fila de Produção, Produção.
--   Operador: só Dashboard + ações de execução da Produção (iniciar/
--     pausar/retomar/finalizar/perdas/observações). SEM acesso a
--     Ordens de Corte, Fila de Produção ou Cadastros.
--
-- A UI já esconde o que cada papel não deve ver — isto aqui é a
-- parte que garante que "esconder na tela" não seja a única barreira:
-- um operador não consegue ler/gravar essas tabelas mesmo chamando a
-- API do Supabase diretamente.

-- 1. Amplia o CHECK de usuarios.papel para aceitar 'supervisor' -------------
alter table public.usuarios drop constraint usuarios_papel_check;
alter table public.usuarios add constraint usuarios_papel_check
  check (papel in ('operador', 'supervisor', 'administrador'));

-- 2. Helper de RLS: papel do usuário autenticado -----------------------------
create function public.current_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from public.usuarios where id = auth.uid();
$$;

-- 3. Clientes / Produtos / Tecidos / Mesas de Corte / grade de tamanhos:
--    operador perde acesso (só administrador e supervisor) ------------------
drop policy if exists "clientes_select_same_empresa" on public.clientes;
drop policy if exists "clientes_insert_same_empresa" on public.clientes;
drop policy if exists "clientes_update_same_empresa" on public.clientes;

create policy "clientes_select_same_empresa"
  on public.clientes for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "clientes_insert_same_empresa"
  on public.clientes for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "clientes_update_same_empresa"
  on public.clientes for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

drop policy if exists "produtos_select_same_empresa" on public.produtos;
drop policy if exists "produtos_insert_same_empresa" on public.produtos;
drop policy if exists "produtos_update_same_empresa" on public.produtos;

create policy "produtos_select_same_empresa"
  on public.produtos for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "produtos_insert_same_empresa"
  on public.produtos for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "produtos_update_same_empresa"
  on public.produtos for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

drop policy if exists "tecidos_select_same_empresa" on public.tecidos;
drop policy if exists "tecidos_insert_same_empresa" on public.tecidos;
drop policy if exists "tecidos_update_same_empresa" on public.tecidos;

create policy "tecidos_select_same_empresa"
  on public.tecidos for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "tecidos_insert_same_empresa"
  on public.tecidos for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "tecidos_update_same_empresa"
  on public.tecidos for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

drop policy if exists "mesas_corte_select_same_empresa" on public.mesas_corte;
drop policy if exists "mesas_corte_insert_same_empresa" on public.mesas_corte;
drop policy if exists "mesas_corte_update_same_empresa" on public.mesas_corte;

create policy "mesas_corte_select_same_empresa"
  on public.mesas_corte for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "mesas_corte_insert_same_empresa"
  on public.mesas_corte for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "mesas_corte_update_same_empresa"
  on public.mesas_corte for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

drop policy if exists "produto_tamanhos_select_same_empresa" on public.produto_tamanhos;
drop policy if exists "produto_tamanhos_insert_same_empresa" on public.produto_tamanhos;
drop policy if exists "produto_tamanhos_update_same_empresa" on public.produto_tamanhos;

create policy "produto_tamanhos_select_same_empresa"
  on public.produto_tamanhos for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "produto_tamanhos_insert_same_empresa"
  on public.produto_tamanhos for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "produto_tamanhos_update_same_empresa"
  on public.produto_tamanhos for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

-- 4. Ordens de Corte + itens: mesma regra (sem operador) --------------------
drop policy if exists "ordens_corte_select_same_empresa" on public.ordens_corte;
drop policy if exists "ordens_corte_insert_same_empresa" on public.ordens_corte;
drop policy if exists "ordens_corte_update_same_empresa" on public.ordens_corte;

create policy "ordens_corte_select_same_empresa"
  on public.ordens_corte for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "ordens_corte_insert_same_empresa"
  on public.ordens_corte for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "ordens_corte_update_same_empresa"
  on public.ordens_corte for update
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'))
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

drop policy if exists "ordem_corte_itens_select_same_empresa" on public.ordem_corte_itens;
drop policy if exists "ordem_corte_itens_insert_same_empresa" on public.ordem_corte_itens;
drop policy if exists "ordem_corte_itens_delete_same_empresa" on public.ordem_corte_itens;

create policy "ordem_corte_itens_select_same_empresa"
  on public.ordem_corte_itens for select
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "ordem_corte_itens_insert_same_empresa"
  on public.ordem_corte_itens for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

create policy "ordem_corte_itens_delete_same_empresa"
  on public.ordem_corte_itens for delete
  to authenticated
  using (empresa_id = public.current_empresa_id() and public.current_papel() in ('administrador', 'supervisor'));

-- Observação: quando a Fila de Produção (Sprint 3) e a Produção
-- (Sprint 4) ganharem tabelas próprias, aplicar a mesma regra —
-- supervisor e administrador têm acesso completo; operador só às
-- ações de execução (iniciar/pausar/retomar/finalizar/perdas/
-- observações), nunca a edição da fila em si.
