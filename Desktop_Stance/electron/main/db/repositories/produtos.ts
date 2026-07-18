import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Produto, ProdutoInput, ProdutoUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface ProdutoRow {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToProduto(row: ProdutoRow): Produto {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    codigo: row.codigo,
    descricao: row.descricao,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listProdutosLocal(db: Database.Database): Produto[] {
  const rows = db
    .prepare<[string], ProdutoRow>("SELECT * FROM produtos WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToProduto);
}

/**
 * Mesmo padrão de clientes: 100% offline-first, id gerado aqui e usado
 * sem remapeamento quando o motor de sync (Sprint 6) enviar ao Supabase.
 */
export function createProdutoLocal(db: Database.Database, input: ProdutoInput): Produto {
  const id = randomUUID();
  const now = new Date().toISOString();
  const produto: Produto = {
    id,
    empresa_id: input.empresa_id,
    nome: input.nome,
    codigo: input.codigo ?? null,
    descricao: input.descricao ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO produtos (id, empresa_id, nome, codigo, descricao, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @nome, @codigo, @descricao, 1, @criado_em, @atualizado_em)
    `).run(produto);
    enqueueChange(db, {
      tableName: "produtos",
      recordId: id,
      operation: "insert",
      payload: produto,
    });
  });
  create();

  return produto;
}

export function updateProdutoLocal(
  db: Database.Database,
  id: string,
  patch: ProdutoUpdatePatch,
): Produto {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.codigo !== undefined) {
    fields.push("codigo = @codigo");
    params.codigo = patch.codigo;
  }
  if (patch.descricao !== undefined) {
    fields.push("descricao = @descricao");
    params.descricao = patch.descricao;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE produtos SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "produtos",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], ProdutoRow>("SELECT * FROM produtos WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Produto ${id} não encontrado após atualização.`);
  return rowToProduto(row);
}
