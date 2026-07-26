-- Zenith Cutter — botão "Arquivar" (ordens já canceladas)
-- Rodar no SQL Editor do painel do Supabase, depois de 0036.

-- Arquivada = escondida da lista padrão de Ordens de Corte, sem DELETE
-- físico (mesmo princípio de soft-delete do resto da base). Não
-- participa da state machine de status (regra 4 do CLAUDE.md) — é só
-- um estado de visibilidade. A regra "só pode arquivar ordem já
-- cancelada" é aplicada na camada de aplicação (repositório main), não
-- aqui — mesmo padrão de outras regras de negócio do projeto.
alter table public.ordens_corte
  add column arquivada boolean not null default false;

-- Estende o trigger de 0032 (Operador só muda status/atualizado_em em
-- ordens_corte) pra também travar "arquivada" — sem isso, um Operador
-- conseguiria arquivar/desarquivar via API direta, ação exclusiva de
-- administrador/supervisor (mesma classe de gap já corrigida pra
-- todas as outras colunas nessa tabela).
create or replace function public.ordens_corte_operador_restringe_colunas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_papel() = 'operador' then
    if new.empresa_id <> old.empresa_id
       or new.numero <> old.numero
       or new.cliente_id <> old.cliente_id
       or new.produto_id <> old.produto_id
       or new.tecido_id <> old.tecido_id
       or coalesce(new.observacoes, '') <> coalesce(old.observacoes, '')
       or new.prioridade <> old.prioridade
       or coalesce(new.mesa_atribuida_id::text, '') <> coalesce(old.mesa_atribuida_id::text, '')
       or coalesce(new.prazo::text, '') <> coalesce(old.prazo::text, '')
       or new.arquivada <> old.arquivada
       or new.criado_em <> old.criado_em then
      raise exception 'Operador só pode alterar o status de uma ordem de corte, não os demais campos.';
    end if;
  end if;
  return new;
end;
$$;
