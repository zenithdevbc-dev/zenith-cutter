import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  PIPELINE_PRODUCAO,
  type IniciarProducaoInput,
  type MesaCorteComStatus,
  type OrdemCorte,
  type SessaoProducao,
  type SessaoProducaoResumo,
} from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { registrarHistorico, rowToOrdemCorte, STATUS_LABEL, type OrdemCorteRow } from "./ordensCorte";

interface MesaCorteComStatusRow {
  id: string;
  empresa_id: string;
  nome: string;
  observacoes: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
  ocupada: number;
  sessao_id: string | null;
  ordem_numero: number | null;
}

function rowToMesaComStatus(row: MesaCorteComStatusRow): MesaCorteComStatus {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    nome: row.nome,
    observacoes: row.observacoes,
    ativo: row.ativo === 1,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    ocupada: row.ocupada === 1,
    sessao_id: row.sessao_id,
    ordem_numero: row.ordem_numero,
  };
}

/**
 * "Ocupada" nunca é uma coluna de mesas_corte — é derivada de existir
 * (ou não) uma sessão de produção ativa (em_andamento OU pausada —
 * pausar não libera a mesa, só interrompe o corte) apontando pra ela
 * (ver comentário da migration create_mesas_corte).
 */
export function listMesasComStatusLocal(db: Database.Database): MesaCorteComStatus[] {
  const rows = db
    .prepare<[], MesaCorteComStatusRow>(`
      SELECT
        m.*,
        CASE WHEN sp.id IS NULL THEN 0 ELSE 1 END AS ocupada,
        sp.id AS sessao_id,
        oc.numero AS ordem_numero
      FROM mesas_corte m
      LEFT JOIN sessoes_producao sp ON sp.mesa_id = m.id AND sp.status IN ('em_andamento', 'pausada')
      LEFT JOIN ordens_corte oc ON oc.id = sp.ordem_id
      ORDER BY m.nome ASC
    `)
    .all();
  return rows.map(rowToMesaComStatus);
}

interface SessaoProducaoResumoRow {
  id: string;
  empresa_id: string;
  ordem_id: string;
  mesa_id: string;
  status: string;
  iniciado_por: string;
  iniciado_em: string;
  finalizado_em: string | null;
  criado_em: string;
  atualizado_em: string;
  ordem_numero: number;
  mesa_nome: string;
  iniciado_por_nome: string;
}

function rowToSessaoResumo(row: SessaoProducaoResumoRow): SessaoProducaoResumo {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    ordem_id: row.ordem_id,
    mesa_id: row.mesa_id,
    status: row.status as SessaoProducao["status"],
    iniciado_por: row.iniciado_por,
    iniciado_em: row.iniciado_em,
    finalizado_em: row.finalizado_em,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    ordem_numero: row.ordem_numero,
    mesa_nome: row.mesa_nome,
    iniciado_por_nome: row.iniciado_por_nome,
  };
}

export function listSessoesAtivasLocal(db: Database.Database): SessaoProducaoResumo[] {
  const rows = db
    .prepare<[], SessaoProducaoResumoRow>(`
      SELECT
        sp.*,
        oc.numero AS ordem_numero,
        m.nome AS mesa_nome,
        COALESCE(u.nome, 'Usuário') AS iniciado_por_nome
      FROM sessoes_producao sp
      JOIN ordens_corte oc ON oc.id = sp.ordem_id
      JOIN mesas_corte m ON m.id = sp.mesa_id
      LEFT JOIN usuarios u ON u.id = sp.iniciado_por
      WHERE sp.status = 'em_andamento'
      ORDER BY sp.iniciado_em DESC
    `)
    .all();
  return rows.map(rowToSessaoResumo);
}

/**
 * Início de produção (regra 3.1: exige seleção manual de mesa +
 * confirmação explícita — nunca automático). Cria a sessão, move a
 * ordem de 'em_fila' para 'em_corte' e registra no histórico da ordem.
 * Os índices únicos parciais em sessoes_producao são a garantia real
 * contra mesa ocupada/ordem já iniciada (checagem de app aqui é só
 * pra dar uma mensagem de erro amigável antes de bater no banco).
 */
export function iniciarProducaoLocal(
  db: Database.Database,
  input: IniciarProducaoInput,
  usuarioId: string,
): SessaoProducao {
  const ordem = db
    .prepare<[string], { id: string; empresa_id: string; status: string; numero: number }>(
      "SELECT id, empresa_id, status, numero FROM ordens_corte WHERE id = ?",
    )
    .get(input.ordem_id);
  if (!ordem) throw new Error("Ordem de corte não encontrada.");
  if (ordem.status !== "em_fila") {
    throw new Error("Esta ordem não está na fila de produção.");
  }

  const mesa = db
    .prepare<[string], { id: string; nome: string; ativo: number }>(
      "SELECT id, nome, ativo FROM mesas_corte WHERE id = ?",
    )
    .get(input.mesa_id);
  if (!mesa) throw new Error("Mesa de corte não encontrada.");
  if (mesa.ativo !== 1) throw new Error("Esta mesa de corte está inativa.");

  const mesaOcupada = db
    .prepare<[string], { id: string }>(
      "SELECT id FROM sessoes_producao WHERE mesa_id = ? AND status IN ('em_andamento', 'pausada')",
    )
    .get(input.mesa_id);
  if (mesaOcupada) throw new Error("Esta mesa já está ocupada.");

  const id = randomUUID();
  const now = new Date().toISOString();
  const sessao: SessaoProducao = {
    id,
    empresa_id: ordem.empresa_id,
    ordem_id: ordem.id,
    mesa_id: mesa.id,
    status: "em_andamento",
    iniciado_por: usuarioId,
    iniciado_em: now,
    finalizado_em: null,
    criado_em: now,
    atualizado_em: now,
  };

  const iniciar = db.transaction(() => {
    db.prepare(`
      INSERT INTO sessoes_producao (id, empresa_id, ordem_id, mesa_id, status, iniciado_por, iniciado_em, finalizado_em, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @ordem_id, @mesa_id, @status, @iniciado_por, @iniciado_em, @finalizado_em, @criado_em, @atualizado_em)
    `).run(sessao);
    enqueueChange(db, {
      tableName: "sessoes_producao",
      recordId: id,
      operation: "insert",
      payload: sessao,
    });

    db.prepare("UPDATE ordens_corte SET status = 'em_corte', atualizado_em = ? WHERE id = ?").run(
      now,
      ordem.id,
    );
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: ordem.id,
      operation: "update",
      payload: { status: "em_corte" },
    });

    registrarHistorico(db, {
      empresaId: ordem.empresa_id,
      ordemId: ordem.id,
      usuarioId,
      acao: "mudanca_status",
      descricao: `Produção iniciada na mesa "${mesa.nome}".`,
    });
  });

  try {
    iniciar();
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed.*sessoes_producao\.mesa_id/.test(err.message)) {
      throw new Error("Esta mesa já está ocupada.");
    }
    if (err instanceof Error && /UNIQUE constraint failed.*sessoes_producao\.ordem_id/.test(err.message)) {
      throw new Error("Esta ordem já está em produção.");
    }
    throw err;
  }

  return sessao;
}

/**
 * Avança a ordem uma etapa do pipeline pós-fila (PIPELINE_PRODUCAO:
 * em_corte → embalagem → revisao → despacho → pronto), sempre uma de
 * cada vez — nunca pulando etapa (regra 4, decisão de 2026-07-11).
 * Ao sair de 'em_corte', finaliza a sessão de produção ativa, o que
 * libera a mesa automaticamente (mesa só existe durante o corte).
 */
export function avancarEtapaOrdemLocal(
  db: Database.Database,
  ordemId: string,
  usuarioId: string,
): OrdemCorte {
  const row = db
    .prepare<[string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ?")
    .get(ordemId);
  if (!row) throw new Error("Ordem de corte não encontrada.");

  const index = PIPELINE_PRODUCAO.indexOf(row.status as OrdemCorte["status"]);
  if (index === -1) {
    throw new Error("Esta ordem não está em uma etapa do pipeline de produção.");
  }
  if (index === PIPELINE_PRODUCAO.length - 1) {
    throw new Error("Esta ordem já está pronta — não há próxima etapa.");
  }
  const proximo = PIPELINE_PRODUCAO[index + 1];
  const now = new Date().toISOString();

  if (row.status === "em_corte") {
    const sessaoPausada = db
      .prepare<[string], { id: string }>(
        "SELECT id FROM sessoes_producao WHERE ordem_id = ? AND status = 'pausada'",
      )
      .get(ordemId);
    if (sessaoPausada) {
      throw new Error("Retome a produção antes de avançar de etapa.");
    }
  }

  const avancar = db.transaction(() => {
    if (row.status === "em_corte") {
      const sessaoAtiva = db
        .prepare<[string], { id: string }>(
          "SELECT id FROM sessoes_producao WHERE ordem_id = ? AND status = 'em_andamento'",
        )
        .get(ordemId);
      if (sessaoAtiva) {
        db.prepare(
          "UPDATE sessoes_producao SET status = 'finalizada', finalizado_em = ?, atualizado_em = ? WHERE id = ?",
        ).run(now, now, sessaoAtiva.id);
        enqueueChange(db, {
          tableName: "sessoes_producao",
          recordId: sessaoAtiva.id,
          operation: "update",
          payload: { status: "finalizada", finalizado_em: now },
        });
      }
    }

    db.prepare("UPDATE ordens_corte SET status = ?, atualizado_em = ? WHERE id = ?").run(
      proximo,
      now,
      ordemId,
    );
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: ordemId,
      operation: "update",
      payload: { status: proximo },
    });

    registrarHistorico(db, {
      empresaId: row.empresa_id,
      ordemId,
      usuarioId,
      acao: "mudanca_status",
      descricao: `Status alterado de "${STATUS_LABEL[row.status] ?? row.status}" para "${STATUS_LABEL[proximo] ?? proximo}".`,
    });
  });
  avancar();

  const updatedRow = db
    .prepare<[string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ?")
    .get(ordemId);
  if (!updatedRow) throw new Error("Ordem de corte não encontrada após atualização.");
  return rowToOrdemCorte(updatedRow);
}
