import type Database from "better-sqlite3";
import type { OrdemCorteResumo } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";

interface OrdemCorteResumoRow {
  id: string;
  empresa_id: string;
  numero: number;
  cliente_id: string;
  produto_id: string;
  tecido_id: string;
  status: string;
  prioridade: number;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
  cliente_nome: string;
  produto_nome: string;
  tecido_nome: string;
  quantidade_total: number;
}

function rowToResumo(row: OrdemCorteResumoRow): OrdemCorteResumo {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    numero: row.numero,
    cliente_id: row.cliente_id,
    produto_id: row.produto_id,
    tecido_id: row.tecido_id,
    status: row.status as OrdemCorteResumo["status"],
    prioridade: row.prioridade,
    observacoes: row.observacoes,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    cliente_nome: row.cliente_nome,
    produto_nome: row.produto_nome,
    tecido_nome: row.tecido_nome,
    quantidade_total: row.quantidade_total,
  };
}

/**
 * Fila de Produção = ordens com status 'em_fila', na ordem manual
 * definida por 'prioridade' (mesmo padrão de produto_tamanhos.ordem).
 */
export function listFilaProducaoLocal(db: Database.Database): OrdemCorteResumo[] {
  const rows = db
    .prepare<[], OrdemCorteResumoRow>(`
      SELECT
        oc.*,
        c.nome AS cliente_nome,
        p.nome AS produto_nome,
        t.nome AS tecido_nome,
        COALESCE((SELECT SUM(quantidade) FROM ordem_corte_itens WHERE ordem_id = oc.id), 0) AS quantidade_total
      FROM ordens_corte oc
      JOIN clientes c ON c.id = oc.cliente_id
      JOIN produtos p ON p.id = oc.produto_id
      JOIN tecidos t ON t.id = oc.tecido_id
      WHERE oc.status = 'em_fila'
      ORDER BY oc.prioridade ASC
    `)
    .all();
  return rows.map(rowToResumo);
}

/**
 * Reordenação manual da fila: recebe a lista completa de ids de ordem
 * na nova sequência desejada e regrava 'prioridade' sequencialmente
 * (mesmo padrão de reorderProdutoTamanhosLocal).
 */
export function reorderFilaProducaoLocal(
  db: Database.Database,
  orderedIds: string[],
): OrdemCorteResumo[] {
  const now = new Date().toISOString();

  const apply = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      db.prepare(
        "UPDATE ordens_corte SET prioridade = ?, atualizado_em = ? WHERE id = ?",
      ).run(index, now, id);
      enqueueChange(db, {
        tableName: "ordens_corte",
        recordId: id,
        operation: "update",
        payload: { prioridade: index },
      });
    });
  });
  apply();

  return listFilaProducaoLocal(db).filter((o) => orderedIds.includes(o.id));
}
