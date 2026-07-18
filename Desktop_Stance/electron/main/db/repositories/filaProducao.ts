import type Database from "better-sqlite3";
import type { OrdemCorteResumo } from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { requireAdminOuSupervisor } from "./usuarios";
import { getCurrentEmpresaId } from "../../session";

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
  mesa_atribuida_id: string | null;
  prazo: string | null;
  criado_em: string;
  atualizado_em: string;
  cliente_nome: string;
  produto_nome: string;
  tecido_nome: string;
  quantidade_total: number;
  mesa_atribuida_nome: string | null;
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
    mesa_atribuida_id: row.mesa_atribuida_id,
    prazo: row.prazo,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    cliente_nome: row.cliente_nome,
    produto_nome: row.produto_nome,
    tecido_nome: row.tecido_nome,
    quantidade_total: row.quantidade_total,
    mesa_atribuida_nome: row.mesa_atribuida_nome,
  };
}

/**
 * Fila de Produção = ordens com status 'em_fila', na ordem manual
 * definida por 'prioridade' (mesmo padrão de produto_tamanhos.ordem).
 */
export function listFilaProducaoLocal(db: Database.Database): OrdemCorteResumo[] {
  const rows = db
    .prepare<[string], OrdemCorteResumoRow>(`
      SELECT
        oc.*,
        c.nome AS cliente_nome,
        p.nome AS produto_nome,
        t.nome AS tecido_nome,
        mc.nome AS mesa_atribuida_nome,
        COALESCE((SELECT SUM(quantidade) FROM ordem_corte_itens WHERE ordem_id = oc.id), 0) AS quantidade_total
      FROM ordens_corte oc
      JOIN clientes c ON c.id = oc.cliente_id
      JOIN produtos p ON p.id = oc.produto_id
      JOIN tecidos t ON t.id = oc.tecido_id
      LEFT JOIN mesas_corte mc ON mc.id = oc.mesa_atribuida_id
      WHERE oc.status = 'em_fila' AND oc.empresa_id = ?
      ORDER BY oc.prioridade ASC
    `)
    .all(getCurrentEmpresaId());
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
  usuarioId: string,
): OrdemCorteResumo[] {
  requireAdminOuSupervisor(db, usuarioId, "reordenar a fila de produção");

  const now = new Date().toISOString();
  const empresaId = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      db.prepare(
        "UPDATE ordens_corte SET prioridade = ?, atualizado_em = ? WHERE id = ? AND empresa_id = ?",
      ).run(index, now, id, empresaId);
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
