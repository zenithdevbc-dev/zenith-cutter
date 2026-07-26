import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { Banca, BancaInput, BancaUpdatePatch } from '../models';

/** Camada de dados de Bancas (Terceiros) do mobile — Supabase-direto, admin/supervisor (RLS 0039). */

export async function listBancas(): Promise<Banca[]> {
  const { data, error } = await supabase
    .from('bancas')
    .select(
      'id, empresa_id, nome, responsavel, telefone, whatsapp, email, endereco, tipo_servico, observacoes, ativo, criado_em, atualizado_em',
    )
    .order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createBanca(input: BancaInput): Promise<Banca> {
  const now = new Date().toISOString();
  const banca: Banca = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    nome: input.nome,
    responsavel: input.responsavel ?? null,
    telefone: input.telefone ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    endereco: input.endereco ?? null,
    tipo_servico: input.tipo_servico ?? null,
    observacoes: input.observacoes ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('bancas').insert(banca);
  if (error) throw new Error(error.message);
  return banca;
}

export async function updateBanca(id: string, patch: BancaUpdatePatch): Promise<void> {
  const { error } = await supabase
    .from('bancas')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
