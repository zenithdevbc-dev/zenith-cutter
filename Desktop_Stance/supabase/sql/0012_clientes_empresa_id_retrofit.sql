-- Zenith Cutter — retrofit: clientes nunca ganhou empresa_id em produção
-- Rodar no SQL Editor do painel do Supabase, ANTES de 0011 (0011 já
-- pressupõe que clientes tem empresa_id — foi assim que este bug foi
-- descoberto: 0011 falhou com "column empresa_id does not exist").
--
-- Causa raiz: 0002_clientes.sql foi reescrito no git para já nascer
-- com empresa_id (depois da decisão de multiempresa de 2026-07-07),
-- mas a tabela em produção tinha sido criada antes disso, com a
-- versão antiga do arquivo, e nunca foi retrofitada — igual foi
-- feito para usuarios em 0003. Resultado: RLS de clientes em
-- produção ficou aberta (`using (true)` / `check (true)`), sem
-- nenhum isolamento entre empresas.
--
-- Verificado antes de rodar: só existe 1 empresa e 0 linhas em
-- clientes em produção — backfill é trivial, sem risco de perda de
-- dado ou de escolha errada de empresa.

-- 1. Coluna empresa_id (mesmo padrão de usuarios em 0003) --------------------
alter table public.clientes add column empresa_id uuid references public.empresas (id);

update public.clientes
set empresa_id = (select id from public.empresas order by criado_em limit 1)
where empresa_id is null;

alter table public.clientes alter column empresa_id set not null;

create index clientes_empresa_id_idx on public.clientes (empresa_id);

-- 2. Substitui as policies abertas por escopadas por empresa -----------------
drop policy if exists "clientes_select_authenticated" on public.clientes;
drop policy if exists "clientes_insert_authenticated" on public.clientes;
drop policy if exists "clientes_update_authenticated" on public.clientes;

create policy "clientes_select_same_empresa"
  on public.clientes for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "clientes_insert_same_empresa"
  on public.clientes for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "clientes_update_same_empresa"
  on public.clientes for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE (mesmo padrão de sempre — soft delete via
-- ativo = false). A restrição adicional de papel (excluir operador)
-- é aplicada logo em seguida por 0011_add_supervisor_role.sql, que
-- reescreve estas mesmas policies incluindo current_papel().
