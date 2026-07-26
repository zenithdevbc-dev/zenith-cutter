import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { Cliente, ClienteInput, ClienteUpdatePatch } from '../models';

/** Cadastro de Clientes — Supabase-direto, admin/supervisor (RLS 0011). Sem DELETE físico. */

export async function listClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, empresa_id, nome, documento, telefone, email, ativo, criado_em, atualizado_em')
    .order('nome', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCliente(input: ClienteInput): Promise<Cliente> {
  const now = new Date().toISOString();
  const cliente: Cliente = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    nome: input.nome,
    documento: input.documento ?? null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };
  const { error } = await supabase.from('clientes').insert(cliente);
  if (error) throw new Error(error.message);
  return cliente;
}

export async function updateCliente(id: string, patch: ClienteUpdatePatch): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
