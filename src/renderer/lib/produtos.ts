import type { Produto, ProdutoInput, ProdutoUpdatePatch } from "@shared/models";

/**
 * Produtos são 100% offline-first, mesmo padrão de clientes: leitura,
 * criação e edição acontecem direto no SQLite local (via IPC), sem
 * depender do Supabase estar acessível. O envio para a nuvem é
 * responsabilidade do motor de sincronização (Sprint 6).
 */
export function listProdutos(): Promise<Produto[]> {
  return window.zenith.produtos.listLocal();
}

export function createProduto(input: ProdutoInput): Promise<Produto> {
  return window.zenith.produtos.createLocal(input);
}

export function updateProduto(id: string, patch: ProdutoUpdatePatch): Promise<Produto> {
  return window.zenith.produtos.updateLocal(id, patch);
}
