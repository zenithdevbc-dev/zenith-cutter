-- Zenith Cutter — Sprint 1: salvaguarda contra trava do último admin
-- Rodar no SQL Editor do painel do Supabase, depois de 0001_usuarios.sql
-- e 0003_empresas_multi_tenant.sql.
--
-- Bug encontrado em 2026-07-09: o único administrador de uma empresa
-- ficou com ativo = false (causa exata não identificada — possivelmente
-- um toggle acidental na tela de Usuários). O login parava de funcionar
-- (o app força signOut quando ativo = false, propositalmente — ver
-- auth-context.tsx), e não havia como reverter pela própria tela: a
-- policy de UPDATE de usuarios exige is_admin(), que por sua vez exige
-- ativo = true — ou seja, um admin que se desativa (ou é rebaixado a
-- operador) fica permanentemente travado se for o único admin ativo da
-- empresa, sem nenhum caminho de autorrecuperação. Precisou de acesso
-- direto ao banco para destravar.
--
-- Este trigger bloqueia, no próprio Postgres (não dá pra contornar via
-- API/RLS), qualquer UPDATE que desative ou rebaixe o último
-- administrador ativo de uma empresa.
create function public.prevent_last_admin_lockout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.papel = 'administrador' and old.ativo = true
     and (new.ativo = false or new.papel <> 'administrador') then
    if not exists (
      select 1 from public.usuarios
      where empresa_id = old.empresa_id
        and papel = 'administrador'
        and ativo = true
        and id <> old.id
    ) then
      raise exception 'Não é possível desativar ou rebaixar o único administrador ativo da empresa.';
    end if;
  end if;
  return new;
end;
$$;

create trigger usuarios_prevent_last_admin_lockout
  before update on public.usuarios
  for each row execute function public.prevent_last_admin_lockout();
