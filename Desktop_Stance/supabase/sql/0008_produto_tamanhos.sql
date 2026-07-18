-- Zenith Cutter — Sprint 1: Grade de tamanhos do Produto
-- Rodar no SQL Editor do painel do Supabase (Database > SQL Editor),
-- na ordem: 0001_usuarios.sql, 0003_empresas_multi_tenant.sql,
-- 0004_produtos.sql, este aqui.
-- Depende de public.set_atualizado_em() (0001) e
-- public.current_empresa_id() (0003).

-- Grade de tamanhos: tamanho é texto livre digitado pelo usuário (não
-- um enum fixo — cada produto pode ter uma grade diferente, ex.: P/M/G
-- ou numérica), com uma ordem explícita que o usuário controla
-- (reordenar a grade). Mesmo padrão offline-first das demais tabelas:
-- id gerado no app, Supabase é só o espelho na nuvem.
create table public.produto_tamanhos (
  id            uuid primary key,
  empresa_id    uuid not null references public.empresas (id),
  produto_id    uuid not null references public.produtos (id),
  tamanho       text not null,
  ordem         integer not null,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index produto_tamanhos_produto_id_idx on public.produto_tamanhos (produto_id);
create index produto_tamanhos_empresa_id_idx on public.produto_tamanhos (empresa_id);

create trigger produto_tamanhos_set_atualizado_em
  before update on public.produto_tamanhos
  for each row execute function public.set_atualizado_em();

alter table public.produto_tamanhos enable row level security;

-- Mesma regra dos demais cadastros: qualquer usuário autenticado da
-- MESMA empresa pode ver, criar e editar a grade.
create policy "produto_tamanhos_select_same_empresa"
  on public.produto_tamanhos for select
  to authenticated
  using (empresa_id = public.current_empresa_id());

create policy "produto_tamanhos_insert_same_empresa"
  on public.produto_tamanhos for insert
  to authenticated
  with check (empresa_id = public.current_empresa_id());

create policy "produto_tamanhos_update_same_empresa"
  on public.produto_tamanhos for update
  to authenticated
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- Sem policy de DELETE: nunca há exclusão física — remover um tamanho
-- da grade é UPDATE ativo = false, preservando auditoria e evitando
-- quebrar referências futuras (Ordens de Corte apontando para o
-- tamanho).
