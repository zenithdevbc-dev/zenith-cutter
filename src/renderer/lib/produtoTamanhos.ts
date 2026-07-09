import type {
  ProdutoTamanho,
  ProdutoTamanhoInput,
  ProdutoTamanhoUpdatePatch,
} from "@shared/models";

/**
 * Grade de tamanhos de um produto: mesmo padrão offline-first das
 * demais tabelas de negócio — leitura, criação, edição e reordenação
 * acontecem direto no SQLite local (via IPC).
 */
export function listProdutoTamanhos(produtoId: string): Promise<ProdutoTamanho[]> {
  return window.zenith.produtoTamanhos.listLocal(produtoId);
}

export function createProdutoTamanho(input: ProdutoTamanhoInput): Promise<ProdutoTamanho> {
  return window.zenith.produtoTamanhos.createLocal(input);
}

export function updateProdutoTamanho(
  id: string,
  patch: ProdutoTamanhoUpdatePatch,
): Promise<ProdutoTamanho> {
  return window.zenith.produtoTamanhos.updateLocal(id, patch);
}

export function reorderProdutoTamanhos(orderedIds: string[]): Promise<ProdutoTamanho[]> {
  return window.zenith.produtoTamanhos.reorderLocal(orderedIds);
}
