import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  PIPELINE_PRODUCAO,
  type AcaoOrdemCorteHistorico,
  type OrdemCorte,
  type OrdemCorteHistoricoEntry,
  type OrdemCorteInput,
  type OrdemCorteItem,
  type OrdemCorteResumo,
  type OrdemCorteUpdatePatch,
} from "../../../../src/shared/models";
import { enqueueChange } from "../../sync/queue";
import { requireAdminOuSupervisor } from "./usuarios";
import { getCurrentEmpresaId } from "../../session";

export const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_fila: "Em Fila",
  cancelada: "Cancelada",
  em_corte: "Em Corte",
  embalagem: "Embalagem",
  revisao: "Revisão",
  despacho: "Despacho",
  pronto: "Pronto",
};

interface OrdemCorteHistoricoRow {
  id: string;
  empresa_id: string;
  ordem_id: string;
  usuario_id: string;
  usuario_nome: string;
  acao: AcaoOrdemCorteHistorico;
  descricao: string;
  criado_em: string;
}

export function registrarHistorico(
  db: Database.Database,
  params: {
    empresaId: string;
    ordemId: string;
    usuarioId: string;
    acao: AcaoOrdemCorteHistorico;
    descricao: string;
  },
) {
  const id = randomUUID();
  const criadoEm = new Date().toISOString();
  db.prepare(`
    INSERT INTO ordem_corte_historico (id, empresa_id, ordem_id, usuario_id, acao, descricao, criado_em)
    VALUES (@id, @empresa_id, @ordem_id, @usuario_id, @acao, @descricao, @criado_em)
  `).run({
    id,
    empresa_id: params.empresaId,
    ordem_id: params.ordemId,
    usuario_id: params.usuarioId,
    acao: params.acao,
    descricao: params.descricao,
    criado_em: criadoEm,
  });
  enqueueChange(db, {
    tableName: "ordem_corte_historico",
    recordId: id,
    operation: "insert",
    payload: {
      id,
      empresa_id: params.empresaId,
      ordem_id: params.ordemId,
      usuario_id: params.usuarioId,
      acao: params.acao,
      descricao: params.descricao,
      criado_em: criadoEm,
    },
  });
}

export function listOrdemCorteHistoricoLocal(
  db: Database.Database,
  ordemId: string,
): OrdemCorteHistoricoEntry[] {
  return db
    .prepare<[string, string], OrdemCorteHistoricoRow>(`
      SELECT h.*, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM ordem_corte_historico h
      LEFT JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.ordem_id = ? AND h.empresa_id = ?
      ORDER BY h.criado_em DESC
    `)
    .all(ordemId, getCurrentEmpresaId());
}

export interface OrdemCorteRow {
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
  banca_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface OrdemCorteResumoRow extends OrdemCorteRow {
  cliente_nome: string;
  produto_nome: string;
  tecido_nome: string;
  quantidade_total: number;
  mesa_atribuida_nome: string | null;
  banca_nome: string | null;
}

interface OrdemCorteItemRow {
  id: string;
  empresa_id: string;
  ordem_id: string;
  produto_tamanho_id: string;
  tamanho: string;
  quantidade: number;
}

export function rowToOrdemCorte(row: OrdemCorteRow): OrdemCorte {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    numero: row.numero,
    cliente_id: row.cliente_id,
    produto_id: row.produto_id,
    tecido_id: row.tecido_id,
    status: row.status as OrdemCorte["status"],
    prioridade: row.prioridade,
    observacoes: row.observacoes,
    mesa_atribuida_id: row.mesa_atribuida_id,
    prazo: row.prazo,
    banca_id: row.banca_id,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

function rowToResumo(row: OrdemCorteResumoRow): OrdemCorteResumo {
  return {
    ...rowToOrdemCorte(row),
    cliente_nome: row.cliente_nome,
    produto_nome: row.produto_nome,
    tecido_nome: row.tecido_nome,
    quantidade_total: row.quantidade_total,
    mesa_atribuida_nome: row.mesa_atribuida_nome,
    banca_nome: row.banca_nome,
  };
}

const RESUMO_SELECT = `
  SELECT
    oc.*,
    c.nome AS cliente_nome,
    p.nome AS produto_nome,
    t.nome AS tecido_nome,
    mc.nome AS mesa_atribuida_nome,
    bc.nome AS banca_nome,
    COALESCE((SELECT SUM(quantidade) FROM ordem_corte_itens WHERE ordem_id = oc.id), 0) AS quantidade_total
  FROM ordens_corte oc
  JOIN clientes c ON c.id = oc.cliente_id
  JOIN produtos p ON p.id = oc.produto_id
  JOIN tecidos t ON t.id = oc.tecido_id
  LEFT JOIN mesas_corte mc ON mc.id = oc.mesa_atribuida_id
  LEFT JOIN bancas bc ON bc.id = oc.banca_id
`;

export function listOrdensCorteLocal(db: Database.Database): OrdemCorteResumo[] {
  const rows = db
    .prepare<[string], OrdemCorteResumoRow>(`${RESUMO_SELECT} WHERE oc.empresa_id = ? ORDER BY oc.numero DESC`)
    .all(getCurrentEmpresaId());
  return rows.map(rowToResumo);
}

export function getOrdemCorteResumoLocal(
  db: Database.Database,
  id: string,
): OrdemCorteResumo | null {
  const row = db
    .prepare<[string, string], OrdemCorteResumoRow>(`${RESUMO_SELECT} WHERE oc.id = ? AND oc.empresa_id = ?`)
    .get(id, getCurrentEmpresaId());
  return row ? rowToResumo(row) : null;
}

/**
 * Sugestão de número pra próxima ordem: maior número já usado na
 * própria empresa + 1 (ou 1, se ainda não existir nenhuma). É só
 * sugestão — o usuário pode digitar outro na criação.
 */
export function getNextOrdemCorteNumeroLocal(
  db: Database.Database,
  empresaId: string,
): number {
  const row = db
    .prepare<[string], { max_numero: number | null }>(
      "SELECT MAX(numero) as max_numero FROM ordens_corte WHERE empresa_id = ?",
    )
    .get(empresaId);
  return (row?.max_numero ?? 0) + 1;
}

export function listOrdemCorteItensLocal(
  db: Database.Database,
  ordemId: string,
): OrdemCorteItem[] {
  const rows = db
    .prepare<[string, string], OrdemCorteItemRow>(`
      SELECT oci.*, pt.tamanho AS tamanho
      FROM ordem_corte_itens oci
      JOIN produto_tamanhos pt ON pt.id = oci.produto_tamanho_id
      WHERE oci.ordem_id = ? AND oci.empresa_id = ?
      ORDER BY pt.ordem ASC
    `)
    .all(ordemId, getCurrentEmpresaId());
  return rows;
}

function insertItens(
  db: Database.Database,
  empresaId: string,
  ordemId: string,
  itens: { produto_tamanho_id: string; quantidade: number }[],
) {
  const stmt = db.prepare(`
    INSERT INTO ordem_corte_itens (id, empresa_id, ordem_id, produto_tamanho_id, quantidade)
    VALUES (@id, @empresa_id, @ordem_id, @produto_tamanho_id, @quantidade)
  `);
  for (const item of itens) {
    const id = randomUUID();
    stmt.run({
      id,
      empresa_id: empresaId,
      ordem_id: ordemId,
      produto_tamanho_id: item.produto_tamanho_id,
      quantidade: item.quantidade,
    });
    enqueueChange(db, {
      tableName: "ordem_corte_itens",
      recordId: id,
      operation: "insert",
      payload: { id, empresa_id: empresaId, ordem_id: ordemId, ...item },
    });
  }
}

function getNextPrioridadeFilaLocal(db: Database.Database, empresaId: string): number {
  const row = db
    .prepare<[string], { max_prioridade: number | null }>(
      "SELECT MAX(prioridade) as max_prioridade FROM ordens_corte WHERE empresa_id = ?",
    )
    .get(empresaId);
  return (row?.max_prioridade ?? -1) + 1;
}

/**
 * Ordem entra direto na fila de produção ao ser criada (fecha o item
 * pendente do Sprint 2 — "entrada automática na fila"): status nasce
 * 'em_fila', não 'aberta'. 'aberta' continua um status válido (editável
 * manualmente depois, ex.: puxar a ordem de volta pra rascunho), só
 * deixa de ser o padrão de criação.
 */
export function createOrdemCorteLocal(
  db: Database.Database,
  input: OrdemCorteInput,
  usuarioId: string,
): OrdemCorte {
  const id = randomUUID();
  const now = new Date().toISOString();
  const ordem: OrdemCorte = {
    id,
    empresa_id: input.empresa_id,
    numero: input.numero,
    cliente_id: input.cliente_id,
    produto_id: input.produto_id,
    tecido_id: input.tecido_id,
    status: "em_fila",
    prioridade: getNextPrioridadeFilaLocal(db, input.empresa_id),
    observacoes: input.observacoes ?? null,
    mesa_atribuida_id: null,
    prazo: input.prazo ?? null,
    banca_id: input.banca_id ?? null,
    criado_em: now,
    atualizado_em: now,
  };

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO ordens_corte (id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, prioridade, observacoes, mesa_atribuida_id, prazo, banca_id, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @numero, @cliente_id, @produto_id, @tecido_id, @status, @prioridade, @observacoes, @mesa_atribuida_id, @prazo, @banca_id, @criado_em, @atualizado_em)
    `).run(ordem);
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: id,
      operation: "insert",
      payload: ordem,
    });
    insertItens(db, input.empresa_id, id, input.itens);
    registrarHistorico(db, {
      empresaId: input.empresa_id,
      ordemId: id,
      usuarioId,
      acao: "criacao",
      descricao: "Ordem de corte criada e enviada à fila de produção.",
    });
  });

  try {
    create();
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed.*numero/.test(err.message)) {
      throw new Error(`Já existe uma ordem de corte com o número ${input.numero} nesta empresa.`);
    }
    throw err;
  }

  return ordem;
}

export function updateOrdemCorteLocal(
  db: Database.Database,
  id: string,
  patch: OrdemCorteUpdatePatch,
  usuarioId: string,
): OrdemCorte {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.cliente_id !== undefined) {
    fields.push("cliente_id = @cliente_id");
    params.cliente_id = patch.cliente_id;
  }
  if (patch.produto_id !== undefined) {
    fields.push("produto_id = @produto_id");
    params.produto_id = patch.produto_id;
  }
  if (patch.tecido_id !== undefined) {
    fields.push("tecido_id = @tecido_id");
    params.tecido_id = patch.tecido_id;
  }
  if (patch.observacoes !== undefined) {
    fields.push("observacoes = @observacoes");
    params.observacoes = patch.observacoes;
  }
  if (patch.prazo !== undefined) {
    fields.push("prazo = @prazo");
    params.prazo = patch.prazo;
  }
  if (patch.banca_id !== undefined) {
    fields.push("banca_id = @banca_id");
    params.banca_id = patch.banca_id;
  }
  if (patch.status !== undefined) {
    fields.push("status = @status");
    params.status = patch.status;
  }
  fields.push("atualizado_em = @atualizado_em");
  params.atualizado_em = new Date().toISOString();

  const row = db
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!row) throw new Error(`Ordem de Corte ${id} não encontrada.`);

  // Etapas do pipeline de execução (em_corte/embalagem/revisao/
  // despacho/pronto) só são setadas por iniciarProducaoLocal ou
  // avancarEtapaOrdemLocal — nunca por edição livre (regra 4: sem
  // pular etapas). Bloqueia só a transição real pra uma dessas
  // etapas, não o reenvio do próprio patch com o status atual
  // inalterado (o form de edição sempre reenvia 'status').
  if (
    patch.status !== undefined &&
    PIPELINE_PRODUCAO.includes(patch.status) &&
    patch.status !== row.status
  ) {
    throw new Error(
      `Status '${STATUS_LABEL[patch.status] ?? patch.status}' só pode ser definido pelo fluxo de produção (Iniciar / Avançar etapa), não por edição direta.`,
    );
  }

  params.empresa_id = getCurrentEmpresaId();

  const apply = db.transaction(() => {
    db.prepare(`UPDATE ordens_corte SET ${fields.join(", ")} WHERE id = @id AND empresa_id = @empresa_id`).run(params);
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: id,
      operation: "update",
      payload: patch,
    });

    if (patch.itens !== undefined) {
      const oldItens = db
        .prepare<[string], { id: string }>(
          "SELECT id FROM ordem_corte_itens WHERE ordem_id = ?",
        )
        .all(id);
      db.prepare("DELETE FROM ordem_corte_itens WHERE ordem_id = ?").run(id);
      for (const old of oldItens) {
        enqueueChange(db, {
          tableName: "ordem_corte_itens",
          recordId: old.id,
          operation: "delete",
          payload: { id: old.id },
        });
      }
      insertItens(db, row.empresa_id, id, patch.itens);
    }

    const statusChanged = patch.status !== undefined && patch.status !== row.status;
    const outrosCamposMudaram =
      patch.cliente_id !== undefined ||
      patch.produto_id !== undefined ||
      patch.tecido_id !== undefined ||
      patch.observacoes !== undefined ||
      patch.prazo !== undefined ||
      patch.banca_id !== undefined ||
      patch.itens !== undefined;

    if (statusChanged) {
      registrarHistorico(db, {
        empresaId: row.empresa_id,
        ordemId: id,
        usuarioId,
        acao: patch.status === "cancelada" ? "cancelamento" : "mudanca_status",
        descricao: `Status alterado de "${STATUS_LABEL[row.status] ?? row.status}" para "${STATUS_LABEL[patch.status as string] ?? patch.status}".`,
      });
    }
    if (outrosCamposMudaram) {
      registrarHistorico(db, {
        empresaId: row.empresa_id,
        ordemId: id,
        usuarioId,
        acao: "edicao",
        descricao: "Dados da ordem de corte editados.",
      });
    }
  });
  apply();

  const updatedRow = db
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!updatedRow) throw new Error(`Ordem de Corte ${id} não encontrada após atualização.`);
  return rowToOrdemCorte(updatedRow);
}

/**
 * Duplicar cria uma ordem nova (id novo, status volta para 'aberta')
 * copiando cliente/produto/tecido/observações e os itens da grade.
 */
export function duplicateOrdemCorteLocal(
  db: Database.Database,
  id: string,
  usuarioId: string,
): OrdemCorte {
  const original = db
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(id, getCurrentEmpresaId());
  if (!original) throw new Error(`Ordem de Corte ${id} não encontrada.`);

  const itens = db
    .prepare<[string], { produto_tamanho_id: string; quantidade: number }>(
      "SELECT produto_tamanho_id, quantidade FROM ordem_corte_itens WHERE ordem_id = ?",
    )
    .all(id);

  const nova = createOrdemCorteLocal(
    db,
    {
      empresa_id: original.empresa_id,
      numero: getNextOrdemCorteNumeroLocal(db, original.empresa_id),
      cliente_id: original.cliente_id,
      produto_id: original.produto_id,
      tecido_id: original.tecido_id,
      observacoes: original.observacoes,
      itens,
    },
    usuarioId,
  );

  registrarHistorico(db, {
    empresaId: original.empresa_id,
    ordemId: nova.id,
    usuarioId,
    acao: "duplicacao",
    descricao: `Ordem de corte duplicada a partir de outra ordem (${original.id.slice(0, 8)}).`,
  });

  return nova;
}

/**
 * Pré-atribuição de mesa na fila (decisão de 2026-07-16): não reserva
 * a mesa (a garantia real contra mesa ocupada é o índice único de
 * sessoes_producao, aplicado só ao iniciar de fato) — é só uma
 * organização da fila, por isso não exige PIN (mesmo espírito da
 * reordenação de prioridade). Só faz sentido enquanto a ordem está
 * 'em_fila'.
 */
export function atribuirMesaFilaLocal(
  db: Database.Database,
  ordemId: string,
  mesaAtribuidaId: string | null,
  usuarioId: string,
): OrdemCorteResumo {
  requireAdminOuSupervisor(db, usuarioId, "atribuir mesa na fila de produção");

  const row = db
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(ordemId, getCurrentEmpresaId());
  if (!row) throw new Error(`Ordem de Corte ${ordemId} não encontrada.`);
  if (row.status !== "em_fila") {
    throw new Error("Só é possível atribuir mesa a uma ordem que está na fila de produção.");
  }

  let mesaNome: string | null = null;
  if (mesaAtribuidaId) {
    const mesa = db
      .prepare<[string], { nome: string }>("SELECT nome FROM mesas_corte WHERE id = ?")
      .get(mesaAtribuidaId);
    if (!mesa) throw new Error("Mesa de corte não encontrada.");
    mesaNome = mesa.nome;
  }

  const now = new Date().toISOString();
  const apply = db.transaction(() => {
    db.prepare(
      "UPDATE ordens_corte SET mesa_atribuida_id = ?, atualizado_em = ? WHERE id = ?",
    ).run(mesaAtribuidaId, now, ordemId);
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: ordemId,
      operation: "update",
      payload: { mesa_atribuida_id: mesaAtribuidaId },
    });
    registrarHistorico(db, {
      empresaId: row.empresa_id,
      ordemId,
      usuarioId,
      acao: "edicao",
      descricao: mesaNome
        ? `Mesa "${mesaNome}" atribuída na fila de produção.`
        : "Atribuição de mesa removida da fila de produção.",
    });
  });
  apply();

  const updated = getOrdemCorteResumoLocal(db, ordemId);
  if (!updated) throw new Error(`Ordem de Corte ${ordemId} não encontrada após atualização.`);
  return updated;
}
