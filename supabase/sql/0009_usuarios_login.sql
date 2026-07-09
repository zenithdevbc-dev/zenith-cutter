-- Zenith Cutter — Sprint 1: login por nome de usuário (não e-mail)
-- Rodar no SQL Editor do painel do Supabase, depois de 0001_usuarios.sql
-- e 0003_empresas_multi_tenant.sql.
--
-- Decisão: a credencial usada para logar deixa de ser o e-mail e passa a
-- ser um "nome de login" (username) próprio, guardado em usuarios.login.
-- O Supabase Auth continua exigindo e-mail internamente
-- (signInWithPassword só aceita email/phone) — o cadastro de usuário
-- continua pedindo e-mail normalmente. O app resolve login -> email
-- através de resolve_login_email() ANTES de chamar signInWithPassword,
-- e então chama com o e-mail resolvido.

alter table public.usuarios add column login text;

-- Único, mas não NOT NULL ainda (contas existentes sem login
-- cadastrado não podem quebrar a migration). Depois de garantir que
-- toda linha tem login preenchido, rode manualmente:
--   alter table public.usuarios alter column login set not null;
create unique index usuarios_login_key on public.usuarios (login);

-- Trigger de criação de perfil agora também grava o login vindo do
-- metadata (a Edge Function create-usuario passa isso ao criar a conta).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, empresa_id, nome, email, login)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    new.raw_user_meta_data->>'login'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Resolve o e-mail correspondente a um login, para uso ANTES do login
-- (contexto anônimo, sem sessão) — security definer ignora RLS, mas só
-- devolve o e-mail (nenhum outro campo), e só de contas ativas.
create or replace function public.resolve_login_email(p_login text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.usuarios where login = p_login and ativo = true limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
