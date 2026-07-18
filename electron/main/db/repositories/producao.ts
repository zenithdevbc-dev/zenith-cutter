import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  PIPELINE_PRODUCAO,
  type IniciarProducaoInput,
  type MesaCorteComStatus,
  type OrdemCorte,
  type ProducaoObservacao,
  type ProducaoObservacaoInput,
  type ProducaoPerda,
  type ProducaoPerdaInput,
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
  pausado_em: string | null;
  tempo_pausado_segundos: number;
  criado_em: string;
  atualizado_em: string;
  ordem_numero: number;
  produto_id: string;
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
    pausado_em: row.pausado_em,
    tempo_pausado_segundos: row.tempo_pausado_segundos,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    ordem_numero: row.ordem_numero,
    produto_id: row.produto_id,
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
        oc.produto_id AS produto_id,
        m.nome AS mesa_nome,
        COALESCE(u.nome, 'Usuário') AS iniciado_por_nome
      FROM sessoes_producao sp
      JOIN ordens_corte oc ON oc.id = sp.ordem_id
      JOIN mesas_corte m ON m.id = sp.mesa_id
      LEFT JOIN usuarios u ON u.id = sp.iniciado_por
      WHERE sp.status IN ('em_andamento', 'pausada')
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
    pausado_em: null,
    tempo_pausado_segundos: 0,
    criado_em: now,
    atualizado_em: now,
  };

  const iniciar = db.transaction(() => {
    db.prepare(`
      INSERT INTO sessoes_producao (id, empresa_id, ordem_id, mesa_id, status, iniciado_por, iniciado_em, finalizado_em, pausado_em, tempo_pausado_segundos, criado_em, atualizado_em)
      VALUES (@id, @empresa_id, @ordem_id, @mesa_id, @status, @iniciado_por, @iniciado_em, @finalizado_em, @pausado_em, @tempo_pausado_segundos, @criado_em, @atualizado_em)
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

interface SessaoProducaoRow {
  id: string;
  empresa_id: string;
  ordem_id: string;
  mesa_id: string;
  status: string;
  iniciado_por: string;
  iniciado_em: string;
  finalizado_em: string | null;
  pausado_em: string | null;
  tempo_pausado_segundos: number;
  criado_em: string;
  atualizado_em: string;
}

function rowToSessao(row: SessaoProducaoRow): SessaoProducao {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    ordem_id: row.ordem_id,
    mesa_id: row.mesa_id,
    status: row.status as SessaoProducao["status"],
    iniciado_por: row.iniciado_por,
    iniciado_em: row.iniciado_em,
    finalizado_em: row.finalizado_em,
    pausado_em: row.pausado_em,
    tempo_pausado_segundos: row.tempo_pausado_segundos,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

/**
 * Pausa a sessão ativa de uma ordem 'em_corte' (regra 3.1: ação
 * explícita, nunca automática). A mesa continua ocupada — pausar não
 * é finalizar (ver índices únicos que cobrem 'pausada' também).
 */
export function pausarProducaoLocal(
  db: Database.Database,
  ordemId: string,
  usuarioId: string,
): SessaoProducao {
  const sessao = db
    .prepare<[string], SessaoProducaoRow>(
      "SELECT * FROM sessoes_producao WHERE ordem_id = ? AND status = 'em_andamento'",
    )
    .get(ordemId);
  if (!sessao) throw new Error("Esta ordem não tem uma sessão de produção em andamento.");

  const now = new Date().toISOString();
  const ordem = db
    .prepare<[string], { empresa_id: string }>("SELECT empresa_id FROM ordens_corte WHERE id = ?")
    .get(ordemId);
  if (!ordem) throw new Error("Ordem de corte não encontrada.");

  const pausar = db.transaction(() => {
    db.prepare(
      "UPDATE sessoes_producao SET status = 'pausada', pausado_em = ?, atualizado_em = ? WHERE id = ?",
    ).run(now, now, sessao.id);
    enqueueChange(db, {
      tableName: "sessoes_producao",
      recordId: sessao.id,
      operation: "update",
      payload: { status: "pausada", pausado_em: now },
    });
    registrarHistorico(db, {
      empresaId: ordem.empresa_id,
      ordemId,
      usuarioId,
      acao: "pausa",
      descricao: "Produção pausada.",
    });
  });
  pausar();

  const updated = db
    .prepare<[string], SessaoProducaoRow>("SELECT * FROM sessoes_producao WHERE id = ?")
    .get(sessao.id);
  if (!updated) throw new Error("Sessão de produção não encontrada após atualização.");
  return rowToSessao(updated);
}

/**
 * Retoma a sessão pausada de uma ordem, acumulando o tempo pausado
 * (usado depois pra calcular o tempo de produção efetivo).
 */
export function retomarProducaoLocal(
  db: Database.Database,
  ordemId: string,
  usuarioId: string,
): SessaoProducao {
  const sessao = db
    .prepare<[string], SessaoProducaoRow>(
      "SELECT * FROM sessoes_producao WHERE ordem_id = ? AND status = 'pausada'",
    )
    .get(ordemId);
  if (!sessao) throw new Error("Esta ordem não tem uma sessão de produção pausada.");
  if (!sessao.pausado_em) throw new Error("Sessão pausada sem registro de início da pausa.");

  const now = new Date().toISOString();
  const segundosPausados = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(sessao.pausado_em).getTime()) / 1000),
  );
  const novoTempoPausado = sessao.tempo_pausado_segundos + segundosPausados;

  const ordem = db
    .prepare<[string], { empresa_id: string }>("SELECT empresa_id FROM ordens_corte WHERE id = ?")
    .get(ordemId);
  if (!ordem) throw new Error("Ordem de corte não encontrada.");

  const retomar = db.transaction(() => {
    db.prepare(
      "UPDATE sessoes_producao SET status = 'em_andamento', pausado_em = NULL, tempo_pausado_segundos = ?, atualizado_em = ? WHERE id = ?",
    ).run(novoTempoPausado, now, sessao.id);
    enqueueChange(db, {
      tableName: "sessoes_producao",
      recordId: sessao.id,
      operation: "update",
      payload: { status: "em_andamento", pausado_em: null, tempo_pausado_segundos: novoTempoPausado },
    });
    registrarHistorico(db, {
      empresaId: ordem.empresa_id,
      ordemId,
      usuarioId,
      acao: "retomada",
      descricao: "Produção retomada.",
    });
  });
  retomar();

  const updated = db
    .prepare<[string], SessaoProducaoRow>("SELECT * FROM sessoes_producao WHERE id = ?")
    .get(sessao.id);
  if (!updated) throw new Error("Sessão de produção não encontrada após atualização.");
  return rowToSessao(updated);
}

interface ProducaoPerdaRow {
  id: string;
  empresa_id: string;
  sessao_id: string;
  produto_tamanho_id: string | null;
  tamanho: string | null;
  quantidade: number;
  motivo: string | null;
  usuario_id: string;
  usuario_nome: string;
  criado_em: string;
}

function rowToPerda(row: ProducaoPerdaRow): ProducaoPerda {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    sessao_id: row.sessao_id,
    produto_tamanho_id: row.produto_tamanho_id,
    tamanho: row.tamanho,
    quantidade: row.quantidade,
    motivo: row.motivo,
    usuario_id: row.usuario_id,
    usuario_nome: row.usuario_nome,
    criado_em: row.criado_em,
  };
}

export function listProducaoPerdasLocal(
  db: Database.Database,
  sessaoId: string,
): ProducaoPerda[] {
  const rows = db
    .prepare<[string], ProducaoPerdaRow>(`
      SELECT pp.*, pt.tamanho AS tamanho, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_perdas pp
      LEFT JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN produto_tamanhos pt ON pt.id = pp.produto_tamanho_id
      WHERE pp.sessao_id = ?
      ORDER BY pp.criado_em DESC
    `)
    .all(sessaoId);
  return rows.map(rowToPerda);
}

/**
 * Perdas de todas as sessões de uma ordem (na prática, no máximo uma —
 * a ordem nunca volta pra fila depois de iniciada — mas a consulta é
 * por ordem, não por sessão, pra não depender dessa suposição).
 * Alimenta a seção "Perdas" do dialog de Info da ordem.
 */
export function listProducaoPerdasPorOrdemLocal(
  db: Database.Database,
  ordemId: string,
): ProducaoPerda[] {
  const rows = db
    .prepare<[string], ProducaoPerdaRow>(`
      SELECT pp.*, pt.tamanho AS tamanho, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_perdas pp
      JOIN sessoes_producao sp ON sp.id = pp.sessao_id
      LEFT JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN produto_tamanhos pt ON pt.id = pp.produto_tamanho_id
      WHERE sp.ordem_id = ?
      ORDER BY pp.criado_em DESC
    `)
    .all(ordemId);
  return rows.map(rowToPerda);
}

/**
 * Registro de perda de material durante a sessão (Sprint 4), por
 * tamanho da grade do produto (decisão de 2026-07-16 — mesmo formato
 * de grid da criação de ordem). Log só de INSERT — não é uma
 * transição de estado (regra 3.1 lista iniciar/pausar/retomar/
 * finalizar como exigindo confirmação explícita; perda é um registro
 * de dados, não muda o status da ordem/sessão), mas fica rastreável
 * por usuário+timestamp (3.5).
 */
export function registrarProducaoPerdaLocal(
  db: Database.Database,
  input: ProducaoPerdaInput,
  usuarioId: string,
): ProducaoPerda {
  const sessao = db
    .prepare<[string], { empresa_id: string }>("SELECT empresa_id FROM sessoes_producao WHERE id = ?")
    .get(input.sessao_id);
  if (!sessao) throw new Error("Sessão de produção não encontrada.");

  const id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    empresa_id: sessao.empresa_id,
    sessao_id: input.sessao_id,
    produto_tamanho_id: input.produto_tamanho_id ?? null,
    quantidade: input.quantidade,
    motivo: input.motivo ?? null,
    usuario_id: usuarioId,
    criado_em: now,
  };

  db.transaction(() => {
    db.prepare(`
      INSERT INTO producao_perdas (id, empresa_id, sessao_id, produto_tamanho_id, quantidade, motivo, usuario_id, criado_em)
      VALUES (@id, @empresa_id, @sessao_id, @produto_tamanho_id, @quantidade, @motivo, @usuario_id, @criado_em)
    `).run(row);
    enqueueChange(db, {
      tableName: "producao_perdas",
      recordId: id,
      operation: "insert",
      payload: row,
    });
  })();

  const usuario = db
    .prepare<[string], { nome: string }>("SELECT nome FROM usuarios WHERE id = ?")
    .get(usuarioId);
  const tamanho = input.produto_tamanho_id
    ? (db
        .prepare<[string], { tamanho: string }>("SELECT tamanho FROM produto_tamanhos WHERE id = ?")
        .get(input.produto_tamanho_id)?.tamanho ?? null)
    : null;
  return { ...row, tamanho, usuario_nome: usuario?.nome ?? "Usuário" };
}

interface ProducaoObservacaoRow {
  id: string;
  empresa_id: string;
  sessao_id: string;
  texto: string;
  usuario_id: string;
  usuario_nome: string;
  criado_em: string;
}

function rowToObservacao(row: ProducaoObservacaoRow): ProducaoObservacao {
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    sessao_id: row.sessao_id,
    texto: row.texto,
    usuario_id: row.usuario_id,
    usuario_nome: row.usuario_nome,
    criado_em: row.criado_em,
  };
}

export function listProducaoObservacoesLocal(
  db: Database.Database,
  sessaoId: string,
): ProducaoObservacao[] {
  const rows = db
    .prepare<[string], ProducaoObservacaoRow>(`
      SELECT po.*, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_observacoes po
      LEFT JOIN usuarios u ON u.id = po.usuario_id
      WHERE po.sessao_id = ?
      ORDER BY po.criado_em DESC
    `)
    .all(sessaoId);
  return rows.map(rowToObservacao);
}

export function registrarProducaoObservacaoLocal(
  db: Database.Database,
  input: ProducaoObservacaoInput,
  usuarioId: string,
): ProducaoObservacao {
  const sessao = db
    .prepare<[string], { empresa_id: string }>("SELECT empresa_id FROM sessoes_producao WHERE id = ?")
    .get(input.sessao_id);
  if (!sessao) throw new Error("Sessão de produção não encontrada.");

  const id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    empresa_id: sessao.empresa_id,
    sessao_id: input.sessao_id,
    texto: input.texto,
    usuario_id: usuarioId,
    criado_em: now,
  };

  db.transaction(() => {
    db.prepare(`
      INSERT INTO producao_observacoes (id, empresa_id, sessao_id, texto, usuario_id, criado_em)
      VALUES (@id, @empresa_id, @sessao_id, @texto, @usuario_id, @criado_em)
    `).run(row);
    enqueueChange(db, {
      tableName: "producao_observacoes",
      recordId: id,
      operation: "insert",
      payload: row,
    });
  })();

  const usuario = db
    .prepare<[string], { nome: string }>("SELECT nome FROM usuarios WHERE id = ?")
    .get(usuarioId);
  return { ...row, usuario_nome: usuario?.nome ?? "Usuário" };
}
