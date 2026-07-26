import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { Produto, ProdutoInput, ProdutoUpdatePatch } from '../models';

/** Cadastro de Produtos — Supabase-direto, admin/supervisor (RLS 0011). Sem DELETE físico. */

export async function listProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, empresa_id, nome, codigo, descricao, ativo, criado_em, atualizado_em')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createProduto(input: ProdutoInput): Promise<Produto> {
  const now = new Date().toISOString();
  const produto: Produto = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    nome: input.nome,
    codigo: input.codigo ?? null,
    descricao: input.descricao ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('produtos').insert(produto);
  if (error) throw new Error(error.message);
  return produto;
}

export async function updateProduto(id: string, patch: ProdutoUpdatePatch): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
