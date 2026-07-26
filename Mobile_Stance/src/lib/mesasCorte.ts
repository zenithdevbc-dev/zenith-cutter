import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { MesaCorte, MesaCorteInput, MesaCorteUpdatePatch } from '../models';

/**
 * Cadastro de Mesas de Corte (CRUD) — Supabase-direto, admin/supervisor
 * pra criar/editar (RLS 0011). A leitura com status (livre/ocupada)
 * usada em Produção é `listMesasComStatus()`, em `lib/producao.ts` —
 * essa fica aberta a todos os papéis (RLS 0038).
 */

export async function listMesasCorte(): Promise<MesaCorte[]> {
  const { data, error } = await supabase
    .from('mesas_corte')
    .select('id, empresa_id, nome, observacoes, ativo, criado_em, atualizado_em')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createMesaCorte(input: MesaCorteInput): Promise<MesaCorte> {
  const now = new Date().toISOString();
  const mesa: MesaCorte = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    nome: input.nome,
    observacoes: input.observacoes ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('mesas_corte').insert(mesa);
  if (error) throw new Error(error.message);
  return mesa;
}

export async function updateMesaCorte(id: string, patch: MesaCorteUpdatePatch): Promise<void> {
  const { error } = await supabase
    .from('mesas_corte')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
