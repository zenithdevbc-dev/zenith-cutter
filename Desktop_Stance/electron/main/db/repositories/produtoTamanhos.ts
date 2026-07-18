import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  ProdutoTamanho,
  ProdutoTamanhoInput,
  ProdutoTamanhoUpdatePatch,
} from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface ProdutoTamanhoRow {
  id: string;
  empresa_id: string;
  produto_id: string;
  tamanho: string;
  ordem: number;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToProdutoTamanho(row: ProdutoTamanhoRow): ProdutoTamanho {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    produto_id: row.produto_id,
    tamanho: row.tamanho,
    ordem: row.ordem,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listProdutoTamanhosLocal(
  db: Database.Database,
  produtoId: string,
): ProdutoTamanho[] {
  const rows = db
    .prepare<[string, string], ProdutoTamanhoRow>(
      "SELECT * FROM produto_tamanhos WHERE produto_id = ? AND empresa_id = ? ORDER BY ordem ASC",
    )
    .all(produtoId, getCurrentEmpresaId());
  return rows.map(rowToProdutoTamanho);
}

/**
 * Tamanho é texto livre digitado pelo usuário (não um enum fixo — cada
 * produto pode ter uma grade diferente, ex.: P/M/G ou numérica). Entra
 * sempre no fim da grade (maior ordem + 1); reordenar é uma ação
 * separada (reorderProdutoTamanhosLocal).
 */
export function createProdutoTamanhoLocal(
  db: Database.Database,
  input: ProdutoTamanhoInput,
): ProdutoTamanho {
  const id = randomUUID();
  const now = new Date().toISOString();

  const maxOrdemRow = db
    .prepare<[string], { max_ordem: number | null }>(
      "SELECT MAX(ordem) as max_ordem FROM produto_tamanhos WHERE produto_id = ?",
    )
    .get(input.produto_id);
  const ordem = (maxOrdemRow?.max_ordem ?? -1) + 1;

  const tamanho: ProdutoTamanho = {
    id,
    empresa_id: input.empresa_id,
    produto_id: input.produto_id,
    tamanho: input.tamanho,
    ordem,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO produto_tamanhos (id, empresa_id, produto_id, tamanho, ordem, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @produto_id, @tamanho, @ordem, 1, @criado_em, @atualizado_em)
    `).run(tamanho);
    enqueueChange(db, {
      tableName: "produto_tamanhos",
      recordId: id,
      operation: "insert",
      payload: tamanho,
    });
  });
  create();

  return tamanho;
}

export function updateProdutoTamanhoLocal(
  db: Database.Database,
  id: string,
  patch: ProdutoTamanhoUpdatePatch,
): ProdutoTamanho {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.tamanho !== undefined) {
    fields.push("tamanho = @tamanho");
    params.tamanho = patch.tamanho;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE produto_tamanhos SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "produto_tamanhos",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], ProdutoTamanhoRow>("SELECT * FROM produto_tamanhos WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Tamanho ${id} não encontrado após atualização.`);
  return rowToProdutoTamanho(row);
}

/**
 * Reordenação da grade: recebe a lista completa de ids na nova ordem
 * desejada (ex.: depois do usuário mover um item na tabela) e regrava
 * `ordem` sequencialmente (0, 1, 2, ...) para cada um.
 */
export function reorderProdutoTamanhosLocal(
  db: Database.Database,
  orderedIds: string[],
): ProdutoTamanho[] {
  const now = new Date().toISOString();

  const empresaId = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      db.prepare(
        "UPDATE produto_tamanhos SET ordem = ?, atualizado_em = ? WHERE id = ? AND empresa_id = ?",
      ).run(index, now, id, empresaId);
      enqueueChange(db, {
        tableName: "produto_tamanhos",
        recordId: id,
        operation: "update",
        payload: { ordem: index },
      });
    });
  });
  apply();

  const placeholders = orderedIds.map(() => "?").join(", ");
  const rows = db
    .prepare<string[], ProdutoTamanhoRow>(
      `SELECT * FROM produto_tamanhos WHERE id IN (${placeholders}) AND empresa_id = ? ORDER BY ordem ASC`,
    )
    .all(...orderedIds, empresaId);
  return rows.map(rowToProdutoTamanho);
}
