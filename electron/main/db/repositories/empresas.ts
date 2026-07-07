import type Database from "better-sqlite3";
import type { Empresa } from "../../../../src/shared/models";

interface EmpresaRow {
  id: string;
  nome: string;
  ativo: number;
  criado_em: string;
}

function rowToEmpresa(row: EmpresaRow): Empresa {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
  };
}

/**
 * Empresas não têm CRUD no app — provisionar uma é operação de backend
 * (ver supabase/functions/create-empresa). Aqui só cacheamos, pra exibir
 * o nome da empresa na UI mesmo offline.
 */
export function cacheEmpresa(db: Database.Database, empresa: Empresa) {
  db.prepare(`
    INSERT INTO empresas (id, nome, ativo, criado_em)
    VALUES (@id, @nome, @ativo, @criado_em)
    ON CONFLICT (id) DO UPDATE SET
      nome = excluded.nome,
      ativo = excluded.ativo,
      criado_em = excluded.criado_em
  `).run({ ...empresa, ativo: empresa.ativo ? 1 : 0 });
}

export function getEmpresaLocal(db: Database.Database, id: string): Empresa | null {
  const row = db
    .prepare<[string], EmpresaRow>("SELECT * FROM empresas WHERE id = ?")
    .get(id);
  return row ? rowToEmpresa(row) : null;
}
