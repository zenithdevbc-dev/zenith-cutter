import type Database from "better-sqlite3";
import type { Usuario, UsuarioUpdatePatch } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { getCurrentEmpresaId } from "../../session";

interface UsuarioRow {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  login: string;
  papel: string;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    email: row.email,
    login: row.login,
    papel: row.papel as Usuario["papel"],
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

/**
 * Defesa em profundidade (auditoria): o gate de admin/supervisor pra
 * reordenar a fila e atribuir mesa (CLAUDE.md 3.6) existia só na UI
 * (ProducaoPage.tsx) — um Operador chamando o IPC direto via DevTools
 * conseguia gravar essas ações na base local mesmo assim (o Supabase
 * rejeitaria via RLS, mas a cópia local ficava corrompida até alguém
 * perceber). Repete a checagem aqui, na camada de repositório.
 */
export function requireAdminOuSupervisor(
  db: Database.Database,
  usuarioId: string,
  acao: string,
): void {
  const row = db
    .prepare<[string, string], { papel: string }>(
      "SELECT papel FROM usuarios WHERE id = ? AND empresa_id = ?",
    )
    .get(usuarioId, getCurrentEmpresaId());
  if (!row || (row.papel !== "administrador" && row.papel !== "supervisor")) {
    throw new Error(`Apenas administrador ou supervisor pode ${acao}.`);
  }
}

export function listUsuariosLocal(db: Database.Database): Usuario[] {
  const rows = db
    .prepare<[string], UsuarioRow>("SELECT * FROM usuarios WHERE empresa_id = ? ORDER BY nome ASC")
    .all(getCurrentEmpresaId());
  return rows.map(rowToUsuario);
}

/**
 * Grava (upsert) a versão mais recente vinda do Supabase no cache local.
 * Não enfileira nada em sync_queue — isto é a "verdade" chegando de fora,
 * não uma alteração local pendente de envio. Resolvido por "mais
 * recente vence" (atualizado_em) desde 2026-07-21 — antes sobrescrevia
 * sem checar, inofensivo enquanto só rodava ao abrir Cadastros >
 * Usuários, mas passou a rodar no ciclo periódico de pull também.
 */
export function cacheUsuarios(db: Database.Database, usuarios: Usuario[]) {
  // "login" tem índice único próprio (não é o conflict target do upsert,
  // que é "id"). Se um usuário foi excluído e recriado no Supabase com o
  // mesmo login mas id novo, a linha antiga (id velho) continua no cache
  // local segurando aquele login e bate de frente com o UPSERT da linha
  // nova — limpa qualquer linha órfã presa nesse login antes de gravar.
  const clearOrphanLogin = db.prepare(
    "DELETE FROM usuarios WHERE login = @login AND login IS NOT NULL AND id != @id",
  );

  const stmt = db.prepare(`
    INSERT INTO usuarios (id, empresa_id, nome, email, login, papel, ativo, criado_em, atualizado_em)
    VALUES (@id, @empresa_id, @nome, @email, @login, @papel, @ativo, @criado_em, @atualizado_em)
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = excluded.empresa_id,
      nome = excluded.nome,
      email = excluded.email,
      login = excluded.login,
      papel = excluded.papel,
      ativo = excluded.ativo,
      criado_em = excluded.criado_em,
      atualizado_em = excluded.atualizado_em,
      cached_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE excluded.atualizado_em > usuarios.atualizado_em
  `);

  const cacheAll = db.transaction((items: Usuario[]) => {
    for (const usuario of items) {
      if (usuario.login) {
        clearOrphanLogin.run({ login: usuario.login, id: usuario.id });
      }
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
  if (patch.login !== undefined) {
    fields.push("login = @login");
    params.login = patch.login;
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

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "usuarios",
      recordId: id,
      operation: "update",
      payload: patch,
    });
  });
  apply();

  const row = db
    .prepare<[string, string], UsuarioRow>("SELECT * FROM usuarios WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Usuário ${id} não encontrado após atualização.`);
  return rowToUsuario(row);
}
