-- Zenith Cutter — Módulo Bancas (terceiros)
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- depois de 0001_usuarios.sql e 0003_empresas_multi_tenant.sql.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Banca é um prestador de serviço terceirizado que pode receber ordens
-- de produção — não é cliente (não encomenda, presta serviço) e não é
-- equipe interna (usuarios). Nasce local primeiro (offline-first de
-- verdade, mesmo padrão de clientes/produtos/tecidos): o id é o mesmo
-- uuid gerado no app; o Supabase é só o espelho na nuvem.
create table public.bancas (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  nome          text not null,
  responsavel   text,
  telefone      text,
  whatsapp      text,
  email         text,
  endereco      text,
  tipo_servico  text,
  observacoes   text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index bancas_nome_idx on public.bancas (nome);
create index bancas_empresa_id_idx on public.bancas (empresa_id);

create trigger bancas_set_atualizado_em
  before update on public.bancas
  for each row execute function public.set_atualizado_em();

alter table public.bancas enable row level security;

-- Mesmo padrão de tecidos/mesas_corte/produtos: cadastro do dia a dia,
-- qualquer usuário autenticado da MESMA empresa pode ver, criar e
-- editar (a restrição a admin/supervisor é só de navegação/UI, ver
-- CadastrosPage.tsx — não duplicada aqui). with check garante que
-- ninguém grava/move uma banca para fora da própria empresa.
create policy "bancas_select_same_empresa"
  on public.bancas for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "bancas_insert_same_empresa"
  on public.bancas for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "bancas_update_same_empresa"
  on public.bancas for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE: nunca há exclusão física — desativar é
-- UPDATE ativo = false, preservando auditoria e evitando quebrar
-- referências futuras (Ordens de Corte apontando para a banca).
