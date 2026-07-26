import { supabase } from './supabase';
import type { Banca } from '../models';

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
