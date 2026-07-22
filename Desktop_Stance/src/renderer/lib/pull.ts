import { supabase } from "./supabase";
import { listUsuarios } from "./usuarios";
import type {
  Cliente,
  Produto,
  Tecido,
  MesaCorte,
  Banca,
  ProdutoTamanho,
  OrdemCorte,
  OrdemCorteItem,
  OrdemCorteHistoricoEntry,
  SessaoProducao,
  ProducaoPerda,
  ProducaoObservacao,
} from "@shared/models";

/**
 * Pull de sincronização (2026-07-21): busca no Supabase e grava no
 * cache local (SQLite). Fecha a outra metade do motor de sync, que até
 * aqui só empurrava local->nuvem — sem isto, um segundo dispositivo
 * logando com o mesmo usuário/empresa nunca via os dados criados no
 * primeiro (RLS já escopa cada SELECT à empresa do usuário logado, não
 * precisa filtrar empresa_id manualmente aqui). Cada tabela é isolada
 * (uma falha não trava as demais) e cada `cache*Local` resolve
 * conflito com o que já existe localmente por conta própria (ver
 * comentários nos repositórios) — este módulo só busca e repassa.
 */
async function pullTable<T>(
  table: string,
  cache: (rows: T[]) => Promise<void>,
): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error || !data) return;
    await cache(data as T[]);
  } catch {
    // Uma tabela falhando (rede, RLS, etc.) não pode impedir o pull das
    // demais nem travar o motor de sync — mesmo espírito do runSync().
  }
}

export async function pullAll(): Promise<void> {
  if (!supabase) return;

  await Promise.all([
    listUsuarios().catch(() => undefined),
    pullTable<Cliente>("clientes", window.zenith.clientes.cacheLocal),
    pullTable<Produto>("produtos", window.zenith.produtos.cacheLocal),
    pullTable<Tecido>("tecidos", window.zenith.tecidos.cacheLocal),
    pullTable<MesaCorte>("mesas_corte", window.zenith.mesasCorte.cacheLocal),
    pullTable<Banca>("bancas", window.zenith.bancas.cacheLocal),
    pullTable<ProdutoTamanho>("produto_tamanhos", window.zenith.produtoTamanhos.cacheLocal),
    pullTable<OrdemCorte>("ordens_corte", window.zenith.ordensCorte.cacheLocal),
    pullTable<OrdemCorteItem>("ordem_corte_itens", window.zenith.ordensCorte.itensCacheLocal),
    pullTable<OrdemCorteHistoricoEntry>(
      "ordem_corte_historico",
      window.zenith.ordensCorte.historicoCacheLocal,
    ),
    pullTable<SessaoProducao>("sessoes_producao", window.zenith.producao.sessoesCacheLocal),
    pullTable<ProducaoPerda>("producao_perdas", window.zenith.producao.perdasCacheLocal),
    pullTable<ProducaoObservacao>(
      "producao_observacoes",
      window.zenith.producao.observacoesCacheLocal,
    ),
  ]);
}
