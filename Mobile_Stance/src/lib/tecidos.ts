import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { Tecido, TecidoInput, TecidoUpdatePatch } from '../models';

/** Cadastro de Materiais (tabela `tecidos`) — Supabase-direto, admin/supervisor (RLS 0011). */

export async function listTecidos(): Promise<Tecido[]> {
  const { data, error } = await supabase
    .from('tecidos')
    .select('id, empresa_id, nome, composicao, cor, ativo, criado_em, atualizado_em')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTecido(input: TecidoInput): Promise<Tecido> {
  const now = new Date().toISOString();
  const tecido: Tecido = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    nome: input.nome,
    composicao: input.composicao ?? null,
    cor: input.cor ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('tecidos').insert(tecido);
  if (error) throw new Error(error.message);
  return tecido;
}

export async function updateTecido(id: string, patch: TecidoUpdatePatch): Promise<void> {
  const { error } = await supabase
    .from('tecidos')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
