-- Zenith Cutter — código de empresa como segunda credencial no login
-- Rodar no SQL Editor do painel do Supabase, depois de 0009.
--
-- Pedido do usuário: campo "EMPRESA" no login, formato AA00 (2 letras
-- maiúsculas + 2 dígitos), atribuído automaticamente na criação da
-- empresa (create-empresa) e único — funciona como uma segunda senha,
-- pra não dar pra logar na empresa errada por acidente (username já é
-- único globalmente, mas login+senha sozinhos não deixam claro em qual
-- empresa a pessoa está entrando).
alter table public.empresas add column codigo text;

-- Backfill das empresas já existentes (só 2 em produção hoje: "Zenith
-- Dev" e "Empresa_Exemplo") com um código aleatório no formato certo.
update public.empresas
set codigo = upper(
  chr(65 + floor(random() * 26)::int) ||
  chr(65 + floor(random() * 26)::int) ||
  floor(random() * 10)::int ||
  floor(random() * 10)::int
)
where codigo is null;

alter table public.empresas alter column codigo set not null;
alter table public.empresas add constraint empresas_codigo_format_check check (codigo ~ '^[A-Z]{2}[0-9]{2}$');
create unique index empresas_codigo_key on public.empresas (codigo);

-- resolve_login_email ganha um segundo parâmetro obrigatório: o código
-- da empresa também precisa bater, ou a função não resolve o e-mail
-- (mesmo tratamento genérico de "login não existe" — não dá pra
-- descobrir se o login existe testando só o código, ou vice-versa).
drop function if exists public.resolve_login_email(text);

create or replace function public.resolve_login_email(p_login text, p_codigo_empresa text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from public.usuarios u
  join public.empresas e on e.id = u.empresa_id
  where u.login = p_login
    and u.ativo = true
    and e.codigo = upper(trim(p_codigo_empresa))
  limit 1;
$$;

grant execute on function public.resolve_login_email(text, text) to anon, authenticated;
