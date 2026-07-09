-- Zenith Cutter — fecha gap de RLS achado em auditoria de segurança
-- (2026-07-09): a policy de SELECT de usuarios não restringia por papel,
-- então Supervisor e Operador conseguiam ler a tabela inteira de
-- usuários (nome/e-mail/login/papel/ativo) da própria empresa via API
-- direta, mesmo com a aba "Usuários" escondida na UI para eles — viola
-- a matriz da seção 3.6 do CLAUDE.md (Cadastros > Usuários é admin-only).
-- Sem impacto entre empresas — só entre papéis da mesma empresa.
--
-- Importante: todo usuário autenticado ainda precisa conseguir ler a
-- PRÓPRIA linha (id = auth.uid()) — é isso que o app consulta logo após
-- o login para saber nome/papel/ativo e montar a navegação. Sem essa
-- cláusula, um Operador travaria no login (mesma classe do bug de
-- last-admin-lockout: perfil some, app força signOut). Só a listagem
-- de outros colegas fica restrita a administrador/supervisor.

drop policy if exists "usuarios_select_same_empresa" on public.usuarios;

create policy "usuarios_select_same_empresa"
  on public.usuarios for select
  to authenticated
  using (
    empresa_id = public.current_empresa_id()
    and (id = auth.uid() or public.current_papel() in ('administrador', 'supervisor'))
  );
