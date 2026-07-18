-- Zenith Cutter — correção de segurança: Operador só muda status da ordem
-- Rodar no SQL Editor do painel do Supabase, depois de 0029.
--
-- Bug encontrado em auditoria (mesma classe do fixado em
-- 0031_sessoes_producao_operador_restringe_colunas.sql): a policy de
-- UPDATE do Operador em ordens_corte
-- (0020_ordens_corte_operador_producao.sql) só valida o valor final de
-- "status" — RLS via USING/WITH CHECK não trava coluna por coluna. Via
-- API direta, um Operador podia reescrever cliente_id/produto_id/
-- tecido_id/observacoes/prioridade/mesa_atribuida_id/prazo de qualquer
-- ordem no pipeline de execução, não só avançar o status.
--
-- Hoje isso é só incidentalmente evitado porque o app sempre manda
-- patches de campo único sem tocar nesses campos (iniciarProducaoLocal/
-- avancarEtapaOrdemLocal só tocam status+atualizado_em). Trigger trava
-- isso no Postgres: pra quem loga como 'operador', qualquer UPDATE só
-- pode mudar status/atualizado_em — todo o resto tem que permanecer
-- igual ao valor anterior. administrador/supervisor não são
-- restringidos (updateOrdemCorteLocal, a edição completa, é exclusiva
-- deles — 3.6).
create function public.ordens_corte_operador_restringe_colunas()
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
       or new.criado_em <> old.criado_em then
      raise exception 'Operador só pode alterar o status de uma ordem de corte, não os demais campos.';
    end if;
  end if;
  return new;
end;
$$;

create trigger ordens_corte_operador_restringir_colunas
  before update on public.ordens_corte
  for each row execute function public.ordens_corte_operador_restringe_colunas();
