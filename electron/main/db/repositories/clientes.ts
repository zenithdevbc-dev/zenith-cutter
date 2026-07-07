import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Cliente, ClienteInput, ClienteUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";

interface ClienteRow {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    documento: row.documento,
    telefone: row.telefone,
    email: row.email,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listClientesLocal(db: Database.Database): Cliente[] {
  const rows = db
    .prepare<[], ClienteRow>("SELECT * FROM clientes ORDER BY nome ASC")
    .all();
  return rows.map(rowToCliente);
}

/**
 * Cria o cliente localmente primeiro (offline-first de verdade — sem
 * nenhuma etapa online necessária, diferente de usuarios). O id é gerado
 * aqui mesmo; quando o motor de sync (Sprint 6) enviar para o Supabase,
 * é esse mesmo id que vai ser usado lá, sem remapeamento.
 */
export function createClienteLocal(db: Database.Database, input: ClienteInput): Cliente {
  const id = randomUUID();
  const now = new Date().toISOString();
  const cliente: Cliente = {
    id,
    nome: input.nome,
    documento: input.documento ?? null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO clientes (id, nome, documento, telefone, email, ativo, criado_em, atualizado_em)
      VALUES (@id, @nome, @documento, @telefone, @email, 1, @criado_em, @atualizado_em)
    `).run(cliente);
    enqueueChange(db, {
      tableName: "clientes",
      recordId: id,
      operation: "insert",
      payload: cliente,
    });
  });
  create();

  return cliente;
}

export function updateClienteLocal(
  db: Database.Database,
  id: string,
  patch: ClienteUpdatePatch,
): Cliente {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.documento !== undefined) {
    fields.push("documento = @documento");
    params.documento = patch.documento;
  }
  if (patch.telefone !== undefined) {
    fields.push("telefone = @telefone");
    params.telefone = patch.telefone;
  }
  if (patch.email !== undefined) {
    fields.push("email = @email");
    params.email = patch.email;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE clientes SET ${fields.join(", ")} WHERE id = @id`).run(params);
    enqueueChange(db, {
      tableName: "clientes",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string], ClienteRow>("SELECT * FROM clientes WHERE id = ?")
    .get(id);
  if (!row) throw new Error(`Cliente ${id} não encontrado após atualização.`);
  return rowToCliente(row);
}
