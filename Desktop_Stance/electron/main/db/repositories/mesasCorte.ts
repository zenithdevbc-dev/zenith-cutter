import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { MesaCorte, MesaCorteInput, MesaCorteUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface MesaCorteRow {
  id: string;
  empresa_id: string;
  nome: string;
  observacoes: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToMesaCorte(row: MesaCorteRow): MesaCorte {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    observacoes: row.observacoes,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listMesasCorteLocal(db: Database.Database): MesaCorte[] {
  const rows = db
    .prepare<[string], MesaCorteRow>("SELECT * FROM mesas_corte WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToMesaCorte);
}

/**
 * Mesmo padrão de clientes/produtos/tecidos: 100% offline-first, id
 * gerado aqui e usado sem remapeamento quando o motor de sync (Sprint 6)
 * enviar ao Supabase.
 */
export function createMesaCorteLocal(db: Database.Database, input: MesaCorteInput): MesaCorte {
  const id = randomUUID();
  const now = new Date().toISOString();
  const mesa: MesaCorte = {
    id,
    empresa_id: input.empresa_id,
    nome: input.nome,
    observacoes: input.observacoes ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO mesas_corte (id, empresa_id, nome, observacoes, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @nome, @observacoes, 1, @criado_em, @atualizado_em)
    `).run(mesa);
    enqueueChange(db, {
      tableName: "mesas_corte",
      recordId: id,
      operation: "insert",
      payload: mesa,
    });
  });
  create();

  return mesa;
}

export function updateMesaCorteLocal(
  db: Database.Database,
  id: string,
  patch: MesaCorteUpdatePatch,
): MesaCorte {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.observacoes !== undefined) {
    fields.push("observacoes = @observacoes");
    params.observacoes = patch.observacoes;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE mesas_corte SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "mesas_corte",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], MesaCorteRow>("SELECT * FROM mesas_corte WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Mesa de corte ${id} não encontrada após atualização.`);
  return rowToMesaCorte(row);
}
