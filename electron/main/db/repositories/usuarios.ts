import type Database from "better-sqlite3";
import type { Usuario, UsuarioUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";

interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    papel: row.papel as Usuario["papel"],
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

export function listUsuariosLocal(db: Database.Database): Usuario[] {
  const rows = db
    .prepare<[], UsuarioRow>("SELECT * FROM usuarios ORDER BY nome ASC")
    .all();
  return rows.map(rowToUsuario);
}

/**
 * Grava (upsert) a versão mais recente vinda do Supabase no cache local.
 * Não enfileira nada em sync_queue — isto é a "verdade" chegando de fora,
 * não uma alteração local pendente de envio.
 */
export function cacheUsuarios(db: Database.Database, usuarios: Usuario[]) {
  const stmt = db.prepare(`
    INSERT INTO usuarios (id, nome, email, papel, ativo, criado_em, atualizado_em)
    VALUES (@id, @nome, @email, @papel, @ativo, @criado_em, @atualizado_em)
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome,
      email = excluded.email,
      papel = excluded.papel,
      ativo = excluded.ativo,
      criado_em = excluded.criado_em,
      atualizado_em = excluded.atualizado_em,
      cached_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `);

  const cacheAll = db.transaction((items: Usuario[]) => {
    for (const usuario of items) {
      stmt.run({ ...usuario, ativo: usuario.ativo ? 1 : 0 });
    }
  });
  cacheAll(usuarios);
}

/**
 * Atualiza o cache local e enfileira a alteração para sincronização.
 * Usado quando a edição parte do operador (não de uma leitura do Supabase).
 * O envio de fato ao Supabase é feito pelo motor de sync (Sprint 6); até lá,
 * a alteração fica pendente em sync_queue sem se perder.
 */
export function updateUsuarioLocal(
  db: Database.Database,
  id: string,
  patch: UsuarioUpdatePatch,
): Usuario {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.nome !== undefined) {
    fields.push("nome = @nome");
    params.nome = patch.nome;
  }
  if (patch.papel !== undefined) {
    fields.push("papel = @papel");
    params.papel = patch.papel;
  }
  if (patch.ativo !== undefined) {
    fields.push("ativo = @ativo");
    params.ativo = patch.ativo ? 1 : 0;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = @id`).run(params);
    enqueueChange(db, {
      tableName: "usuarios",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string], UsuarioRow>("SELECT * FROM usuarios WHERE id = ?")
    .get(id);
  if (!row) throw new Error(`Usuário ${id} não encontrado após atualização.`);
  return rowToUsuario(row);
}
