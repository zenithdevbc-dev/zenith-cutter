import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Cliente, ClienteInput, ClienteUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface ClienteRow {
  id: string;
  empresa_id: string;
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
    empresa_id: row.empresa_id,
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
    .prepare<[string], ClienteRow>("SELECT * FROM clientes WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToCliente);
}

/**
 * Grava (upsert) o que veio do Supabase no cache local — parte do pull
 * de sincronização (2026-07-21: sem isso, um segundo dispositivo com o
 * mesmo usuário/empresa nunca via os dados criados no primeiro, já que
 * o motor de sync só empurrava local->nuvem). Conflito resolvido por
 * "mais recente vence" comparando atualizado_em — protege qualquer
 * edição local ainda não enviada (sync_queue) de ser sobrescrita por
 * uma versão mais antiga vinda do pull.
 */
export function cacheClientesLocal(db: Database.Database, clientes: Cliente[]) {
  const stmt = db.prepare(`
    INSERT INTO clientes (id, empresa_id, nome, documento, telefone, email, ativo, criado_em, atualizado_em)
    VALUES (@id, @empresa_id, @nome, @documento, @telefone, @email, @ativo, @criado_em, @atualizado_em)
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = excluded.empresa_id,
      nome = excluded.nome,
      documento = excluded.documento,
      telefone = excluded.telefone,
      email = excluded.email,
      ativo = excluded.ativo,
      criado_em = excluded.criado_em,
      atualizado_em = excluded.atualizado_em
    WHERE excluded.atualizado_em > clientes.atualizado_em
  `);
  const cacheAll = db.transaction((items: Cliente[]) => {
    for (const c of items) {
      stmt.run({ ...c, ativo: c.ativo ? 1 : 0 });
    }
  });
  cacheAll(clientes);
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
    empresa_id: input.empresa_id,
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
      INSERT INTO clientes (id, empresa_id, nome, documento, telefone, email, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @nome, @documento, @telefone, @email, 1, @criado_em, @atualizado_em)
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

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE clientes SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "clientes",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], ClienteRow>("SELECT * FROM clientes WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Cliente ${id} não encontrado após atualização.`);
  return rowToCliente(row);
}
