import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { ProdutoTamanho, ProdutoTamanhoInput, ProdutoTamanhoUpdatePatch } from '../models';

/**
 * Grade de tamanhos de um produto — Supabase-direto. Leitura é usada
 * tanto em Cadastros (editar a grade) quanto em Produção/Ordens de
 * Corte (montar a grade de quantidade); criação/edição/reordenação são
 * exclusivas de Cadastros (admin/supervisor, RLS 0011 em
 * `produto_tamanhos`).
 */

export async function listProdutoTamanhos(produtoId: string): Promise<ProdutoTamanho[]> {
  const { data, error } = await supabase
    .from('produto_tamanhos')
    .select('id, empresa_id, produto_id, tamanho, ordem, ativo, criado_em, atualizado_em')
    .eq('produto_id', produtoId)
    .order('ordem', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Tamanho é texto livre (P/M/G, numérico, "Único" etc.) — entra sempre no fim da grade. */
export async function createProdutoTamanho(input: ProdutoTamanhoInput): Promise<ProdutoTamanho> {
  const { data: existentes, error: buscaError } = await supabase
    .from('produto_tamanhos')
    .select('ordem')
    .eq('produto_id', input.produto_id)
    .order('ordem', { ascending: false })
    .limit(1);
  if (buscaError) throw buscaError;
  const ordem = existentes && existentes.length > 0 ? existentes[0].ordem + 1 : 0;

  const now = new Date().toISOString();
  const tamanho: ProdutoTamanho = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    produto_id: input.produto_id,
    tamanho: input.tamanho,
    ordem,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('produto_tamanhos').insert(tamanho);
  if (error) throw new Error(error.message);
  return tamanho;
}

export async function updateProdutoTamanho(
  id: string,
  patch: ProdutoTamanhoUpdatePatch,
): Promise<void> {
  const { error } = await supabase
    .from('produto_tamanhos')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Regrava `ordem` sequencialmente (0, 1, 2...) pra lista completa de ids na nova ordem desejada. */
export async function reorderProdutoTamanhos(orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from('produto_tamanhos')
      .update({ ordem: index, atualizado_em: now })
      .eq('id', orderedIds[index]);
    if (error) throw new Error(error.message);
  }
}
