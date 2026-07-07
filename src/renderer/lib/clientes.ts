import type { Cliente, ClienteInput, ClienteUpdatePatch } from "@shared/models";

/**
 * Clientes são 100% offline-first: leitura, criação e edição acontecem
 * direto no SQLite local (via IPC), sem depender do Supabase estar
 * acessível. O envio para a nuvem é responsabilidade do motor de
 * sincronização (Sprint 6), que consome a sync_queue já preenchida aqui.
 */
export function listClientes(): Promise<Cliente[]> {
  return window.zenith.clientes.listLocal();
}

export function createCliente(input: ClienteInput): Promise<Cliente> {
  return window.zenith.clientes.createLocal(input);
}

export function updateCliente(id: string, patch: ClienteUpdatePatch): Promise<Cliente> {
  return window.zenith.clientes.updateLocal(id, patch);
}
