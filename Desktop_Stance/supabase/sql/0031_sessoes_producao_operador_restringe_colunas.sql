-- Zenith Cutter — correção de segurança: colunas imutáveis em sessoes_producao
-- Rodar no SQL Editor do painel do Supabase, depois de 0025.
--
-- Bug encontrado em auditoria: a policy de UPDATE do Operador em
-- 0025_sessoes_producao_operador_update.sql só restringe pelo valor
-- final de "status" — RLS via USING/WITH CHECK não consegue travar
-- coluna por coluna. Na prática, qualquer Operador autenticado podia
-- chamar a API do Supabase diretamente e reescrever iniciado_por ou
-- mesa_id de QUALQUER sessão em_andamento/pausada da empresa —
-- reatribuindo autoria ou mesa de uma sessão que não é dele (quebra
-- 3.5).
--
-- Fix escolhido: travar essas colunas como imutáveis depois do INSERT,
-- pra todo mundo (não só Operador) — nenhum caminho legítimo do app
-- jamais muda empresa_id/ordem_id/mesa_id/iniciado_por/iniciado_em/
-- criado_em de uma sessão depois de criada (conferido em
-- electron/main/db/repositories/producao.ts: as 3 únicas UPDATEs só
-- tocam status/pausado_em/tempo_pausado_segundos/finalizado_em/
-- atualizado_em). Não restringe por "iniciado_por = auth.uid()"
-- porque o app permite que qualquer Operador avance/finalize uma
-- sessão iniciada por outro (handoff de turno) — isso é comportamento
-- normal, não deve quebrar.
--
-- Mesmo padrão de 0005_prevent_last_admin_lockout.sql: trigger no
-- Postgres (não contornável via API/RLS) fecha o que a policy sozinha
-- não cobre.
create function public.sessoes_producao_colunas_imutaveis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id <> old.empresa_id
     or new.ordem_id <> old.ordem_id
     or new.mesa_id <> old.mesa_id
     or new.iniciado_por <> old.iniciado_por
     or new.iniciado_em <> old.iniciado_em
     or new.criado_em <> old.criado_em then
    raise exception 'empresa_id, ordem_id, mesa_id, iniciado_por, iniciado_em e criado_em de uma sessão de produção não podem ser alterados depois de criada.';
  end if;
  return new;
end;
$$;

create trigger sessoes_producao_travar_colunas_imutaveis
  before update on public.sessoes_producao
  for each row execute function public.sessoes_producao_colunas_imutaveis();
