import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Tecido, TecidoInput, TecidoUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface TecidoRow {
  id: string;
  empresa_id: string;
  nome: string;
  composicao: string | null;
  cor: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToTecido(row: TecidoRow): Tecido {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    composicao: row.composicao,
    cor: row.cor,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listTecidosLocal(db: Database.Database): Tecido[] {
  const rows = db
    .prepare<[string], TecidoRow>("SELECT * FROM tecidos WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToTecido);
}

/** Pull de sincronização (2026-07-21) — mesmo padrão de cacheClientesLocal. */
export function cacheTecidosLocal(db: Database.Database, tecidos: Tecido[]) {
  const stmt = db.prepare(`
    INSERT INTO tecidos (id, empresa_id, nome, composicao, cor, ativo, criado_em, atualizado_em)
    VALUES (@id, @empresa_id, @nome, @composicao, @cor, @ativo, @criado_em, @atualizado_em)
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = excluded.empresa_id,
      nome = excluded.nome,
      composicao = excluded.composicao,
      cor = excluded.cor,
      ativo = excluded.ativo,
      criado_em = excluded.criado_em,
      atualizado_em = excluded.atualizado_em
    WHERE excluded.atualizado_em > tecidos.atualizado_em
  `);
  const cacheAll = db.transaction((items: Tecido[]) => {
    for (const t of items) {
      stmt.run({ ...t, ativo: t.ativo ? 1 : 0 });
    }
  });
  cacheAll(tecidos);
}

/**
 * Mesmo padrão de clientes/produtos: 100% offline-first, id gerado aqui
 * e usado sem remapeamento quando o motor de sync (Sprint 6) enviar ao
 * Supabase.
 */
export function createTecidoLocal(db: Database.Database, input: TecidoInput): Tecido {
  const id = randomUUID();
  const now = new Date().toISOString();
  const tecido: Tecido = {
    id,
    empresa_id: input.empresa_id,
    nome: input.nome,
    composicao: input.composicao ?? null,
    cor: input.cor ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO tecidos (id, empresa_id, nome, composicao, cor, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @nome, @composicao, @cor, 1, @criado_em, @atualizado_em)
    `).run(tecido);
    enqueueChange(db, {
      tableName: "tecidos",
      recordId: id,
      operation: "insert",
      payload: tecido,
    });
  });
  create();

  return tecido;
}

export function updateTecidoLocal(
  db: Database.Database,
  id: string,
  patch: TecidoUpdatePatch,
): Tecido {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.composicao !== undefined) {
    fields.push("composicao = @composicao");
    params.composicao = patch.composicao;
  }
  if (patch.cor !== undefined) {
    fields.push("cor = @cor");
    params.cor = patch.cor;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE tecidos SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "tecidos",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], TecidoRow>("SELECT * FROM tecidos WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Tecido ${id} não encontrado após atualização.`);
  return rowToTecido(row);
}
