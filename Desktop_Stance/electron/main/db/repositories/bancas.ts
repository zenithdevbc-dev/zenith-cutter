import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Banca, BancaInput, BancaUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface BancaRow {
  id: string;
  empresa_id: string;
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  tipo_servico: string | null;
  observacoes: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToBanca(row: BancaRow): Banca {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    responsavel: row.responsavel,
    telefone: row.telefone,
    whatsapp: row.whatsapp,
    email: row.email,
    endereco: row.endereco,
    tipo_servico: row.tipo_servico,
    observacoes: row.observacoes,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listBancasLocal(db: Database.Database): Banca[] {
  const rows = db
    .prepare<[string], BancaRow>("SELECT * FROM bancas WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToBanca);
}

/**
 * Mesmo padrão de clientes/produtos/tecidos: 100% offline-first, id
 * gerado aqui e usado sem remapeamento quando o motor de sync enviar
 * ao Supabase.
 */
export function createBancaLocal(db: Database.Database, input: BancaInput): Banca {
  const id = randomUUID();
  const now = new Date().toISOString();
  const banca: Banca = {
    id,
    empresa_id: input.empresa_id,
    nome: input.nome,
    responsavel: input.responsavel ?? null,
    telefone: input.telefone ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    endereco: input.endereco ?? null,
    tipo_servico: input.tipo_servico ?? null,
    observacoes: input.observacoes ?? null,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO bancas (id, empresa_id, nome, responsavel, telefone, whatsapp, email, endereco, tipo_servico, observacoes, ativo, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @nome, @responsavel, @telefone, @whatsapp, @email, @endereco, @tipo_servico, @observacoes, 1, @criado_em, @atualizado_em)
    `).run(banca);
    enqueueChange(db, {
      tableName: "bancas",
      recordId: id,
      operation: "insert",
      payload: banca,
    });
  });
  create();

  return banca;
}

export function updateBancaLocal(
  db: Database.Database,
  id: string,
  patch: BancaUpdatePatch,
): Banca {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.responsavel !== undefined) {
    fields.push("responsavel = @responsavel");
    params.responsavel = patch.responsavel;
  }
  if (patch.telefone !== undefined) {
    fields.push("telefone = @telefone");
    params.telefone = patch.telefone;
  }
  if (patch.whatsapp !== undefined) {
    fields.push("whatsapp = @whatsapp");
    params.whatsapp = patch.whatsapp;
  }
  if (patch.email !== undefined) {
    fields.push("email = @email");
    params.email = patch.email;
  }
  if (patch.endereco !== undefined) {
    fields.push("endereco = @endereco");
    params.endereco = patch.endereco;
  }
  if (patch.tipo_servico !== undefined) {
    fields.push("tipo_servico = @tipo_servico");
    params.tipo_servico = patch.tipo_servico;
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
    db.prepare(`UPDATE bancas SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "bancas",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], BancaRow>("SELECT * FROM bancas WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Banca ${id} não encontrada após atualização.`);
  return rowToBanca(row);
}
