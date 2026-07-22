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
import { getCurrentEmpresaId } from "../../session";

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
    .prepare<[string], MesaCorteComStatusRow>(`
      SELECT
        m.*,
        CASE WHEN sp.id IS NULL THEN 0 ELSE 1 END AS ocupada,
        sp.id AS sessao_id,
        oc.numero AS ordem_numero
      FROM mesas_corte m
      LEFT JOIN sessoes_producao sp ON sp.mesa_id = m.id AND sp.status IN ('em_andamento', 'pausada')
      LEFT JOIN ordens_corte oc ON oc.id = sp.ordem_id
      WHERE m.empresa_id = ?
      ORDER BY m.nome ASC
    `)
    .all(getCurrentEmpresaId());
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

/** Pull de sincronização (2026-07-21) — mesmo padrão de cacheClientesLocal. */
export function cacheSessoesProducaoLocal(db: Database.Database, sessoes: SessaoProducao[]) {
  const stmt = db.prepare(`
    INSERT INTO sessoes_producao (id, empresa_id, ordem_id, mesa_id, status, iniciado_por, iniciado_em, finalizado_em, pausado_em, tempo_pausado_segundos, criado_em, atualizado_em)
    VALUES (@id, @empresa_id, @ordem_id, @mesa_id, @status, @iniciado_por, @iniciado_em, @finalizado_em, @pausado_em, @tempo_pausado_segundos, @criado_em, @atualizado_em)
    ON CONFLICT (id) DO UPDATE SET
      empresa_id = excluded.empresa_id,
      ordem_id = excluded.ordem_id,
      mesa_id = excluded.mesa_id,
      status = excluded.status,
      iniciado_por = excluded.iniciado_por,
      iniciado_em = excluded.iniciado_em,
      finalizado_em = excluded.finalizado_em,
      pausado_em = excluded.pausado_em,
      tempo_pausado_segundos = excluded.tempo_pausado_segundos,
      criado_em = excluded.criado_em,
      atualizado_em = excluded.atualizado_em
    WHERE excluded.atualizado_em > sessoes_producao.atualizado_em
  `);
  const cacheAll = db.transaction((items: SessaoProducao[]) => {
    for (const s of items) stmt.run(s);
  });
  cacheAll(sessoes);
}

export function listSessoesAtivasLocal(db: Database.Database): SessaoProducaoResumo[] {
  const rows = db
    .prepare<[string], SessaoProducaoResumoRow>(`
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
      WHERE sp.status IN ('em_andamento', 'pausada') AND sp.empresa_id = ?
      ORDER BY sp.iniciado_em DESC
    `)
    .all(getCurrentEmpresaId());
  return rows.map(rowToSessaoResumo);
}

/**
 * Início de produção (regra 3.1: exige seleção manual de mesa +
 * confirmação explícita — nunca automático). Cria a sessão, move a
 * ordem de 'em_fila' para 'enfesto' e registra no histórico da ordem.
 * A mesa fica ocupada por 'enfesto' e 'corte' juntos (mesma mesa
 * física — enfesta e depois corta) e só libera ao avançar de 'corte'
 * pra 'embalagem'. Os índices únicos parciais em sessoes_producao são
 * a garantia real contra mesa ocupada/ordem já iniciada (checagem de
 * app aqui é só pra dar uma mensagem de erro amigável antes de bater
 * no banco).
 */
export function iniciarProducaoLocal(
  db: Database.Database,
  input: IniciarProducaoInput,
  usuarioId: string,
): SessaoProducao {
  const empresaId = getCurrentEmpresaId();

  const ordem = db
    .prepare<[string, string], { id: string; empresa_id: string; status: string; numero: number }>(
      "SELECT id, empresa_id, status, numero FROM ordens_corte WHERE id = ? AND empresa_id = ?",
    )
    .get(input.ordem_id, empresaId);
  if (!ordem) throw new Error("Ordem de corte não encontrada.");
  if (ordem.status !== "em_fila") {
    throw new Error("Esta ordem não está na fila de produção.");
  }

  const mesa = db
    .prepare<[string, string], { id: string; nome: string; ativo: number }>(
      "SELECT id, nome, ativo FROM mesas_corte WHERE id = ? AND empresa_id = ?",
    )
    .get(input.mesa_id, empresaId);
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

    db.prepare("UPDATE ordens_corte SET status = 'enfesto', atualizado_em = ? WHERE id = ?").run(
      now,
      ordem.id,
    );
    enqueueChange(db, {
      tableName: "ordens_corte",
      recordId: ordem.id,
      operation: "update",
      payload: { status: "enfesto" },
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
 * enfesto → corte → embalagem → despacho → pronto), sempre uma de
 * cada vez — nunca pulando etapa (regra 4, decisão de 2026-07-21).
 * A mesa fica ocupada durante 'enfesto' e 'corte' (mesma sessão,
 * avançar de enfesto pra corte não mexe nela); só ao sair de 'corte'
 * a sessão de produção ativa é finalizada, liberando a mesa
 * automaticamente. Avançar de 'despacho' marca a ordem como 'pronto'.
 */
export function avancarEtapaOrdemLocal(
  db: Database.Database,
  ordemId: string,
  usuarioId: string,
): OrdemCorte {
  const row = db
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(ordemId, getCurrentEmpresaId());
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

  if (row.status === "enfesto" || row.status === "corte") {
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
    if (row.status === "corte") {
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
    .prepare<[string, string], OrdemCorteRow>("SELECT * FROM ordens_corte WHERE id = ? AND empresa_id = ?")
    .get(ordemId, getCurrentEmpresaId());
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
 * Pausa a sessão ativa de uma ordem em 'enfesto'/'corte' (regra 3.1: ação
 * explícita, nunca automática). A mesa continua ocupada — pausar não
 * é finalizar (ver índices únicos que cobrem 'pausada' também).
 */
export function pausarProducaoLocal(
  db: Database.Database,
  ordemId: string,
  usuarioId: string,
): SessaoProducao {
  const empresaId = getCurrentEmpresaId();
  const sessao = db
    .prepare<[string, string], SessaoProducaoRow>(
      "SELECT * FROM sessoes_producao WHERE ordem_id = ? AND status = 'em_andamento' AND empresa_id = ?",
    )
    .get(ordemId, empresaId);
  if (!sessao) throw new Error("Esta ordem não tem uma sessão de produção em andamento.");

  const now = new Date().toISOString();
  const ordem = db
    .prepare<[string, string], { empresa_id: string }>(
      "SELECT empresa_id FROM ordens_corte WHERE id = ? AND empresa_id = ?",
    )
    .get(ordemId, empresaId);
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
  const empresaId = getCurrentEmpresaId();
  const sessao = db
    .prepare<[string, string], SessaoProducaoRow>(
      "SELECT * FROM sessoes_producao WHERE ordem_id = ? AND status = 'pausada' AND empresa_id = ?",
    )
    .get(ordemId, empresaId);
  if (!sessao) throw new Error("Esta ordem não tem uma sessão de produção pausada.");
  if (!sessao.pausado_em) throw new Error("Sessão pausada sem registro de início da pausa.");

  const now = new Date().toISOString();
  const segundosPausados = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(sessao.pausado_em).getTime()) / 1000),
  );
  const novoTempoPausado = sessao.tempo_pausado_segundos + segundosPausados;

  const ordem = db
    .prepare<[string, string], { empresa_id: string }>(
      "SELECT empresa_id FROM ordens_corte WHERE id = ? AND empresa_id = ?",
    )
    .get(ordemId, empresaId);
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
    .prepare<[string, string], ProducaoPerdaRow>(`
      SELECT pp.*, pt.tamanho AS tamanho, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_perdas pp
      LEFT JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN produto_tamanhos pt ON pt.id = pp.produto_tamanho_id
      WHERE pp.sessao_id = ? AND pp.empresa_id = ?
      ORDER BY pp.criado_em DESC
    `)
    .all(sessaoId, getCurrentEmpresaId());
  return rows.map(rowToPerda);
}

/**
 * Pull de producao_perdas: log imutável (só INSERT) — sem conflito
 * possível, basta inserir o que ainda não existe localmente.
 */
export function cacheProducaoPerdasLocal(db: Database.Database, perdas: ProducaoPerda[]) {
  const stmt = db.prepare(`
    INSERT INTO producao_perdas (id, empresa_id, sessao_id, produto_tamanho_id, quantidade, motivo, usuario_id, criado_em)
    VALUES (@id, @empresa_id, @sessao_id, @produto_tamanho_id, @quantidade, @motivo, @usuario_id, @criado_em)
    ON CONFLICT (id) DO NOTHING
  `);
  const cacheAll = db.transaction((items: ProducaoPerda[]) => {
    for (const p of items) {
      stmt.run({
        id: p.id,
        empresa_id: p.empresa_id,
        sessao_id: p.sessao_id,
        produto_tamanho_id: p.produto_tamanho_id,
        quantidade: p.quantidade,
        motivo: p.motivo,
        usuario_id: p.usuario_id,
        criado_em: p.criado_em,
      });
    }
  });
  cacheAll(perdas);
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
    .prepare<[string, string], ProducaoPerdaRow>(`
      SELECT pp.*, pt.tamanho AS tamanho, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_perdas pp
      JOIN sessoes_producao sp ON sp.id = pp.sessao_id
      LEFT JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN produto_tamanhos pt ON pt.id = pp.produto_tamanho_id
      WHERE sp.ordem_id = ? AND pp.empresa_id = ?
      ORDER BY pp.criado_em DESC
    `)
    .all(ordemId, getCurrentEmpresaId());
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
    .prepare<[string, string], { empresa_id: string }>(
      "SELECT empresa_id FROM sessoes_producao WHERE id = ? AND empresa_id = ?",
    )
    .get(input.sessao_id, getCurrentEmpresaId());
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
    .prepare<[string, string], ProducaoObservacaoRow>(`
      SELECT po.*, COALESCE(u.nome, 'Usuário') AS usuario_nome
      FROM producao_observacoes po
      LEFT JOIN usuarios u ON u.id = po.usuario_id
      WHERE po.sessao_id = ? AND po.empresa_id = ?
      ORDER BY po.criado_em DESC
    `)
    .all(sessaoId, getCurrentEmpresaId());
  return rows.map(rowToObservacao);
}

/**
 * Pull de producao_observacoes: log imutável (só INSERT) — mesmo
 * padrão de cacheProducaoPerdasLocal.
 */
export function cacheProducaoObservacoesLocal(
  db: Database.Database,
  observacoes: ProducaoObservacao[],
) {
  const stmt = db.prepare(`
    INSERT INTO producao_observacoes (id, empresa_id, sessao_id, texto, usuario_id, criado_em)
    VALUES (@id, @empresa_id, @sessao_id, @texto, @usuario_id, @criado_em)
    ON CONFLICT (id) DO NOTHING
  `);
  const cacheAll = db.transaction((items: ProducaoObservacao[]) => {
    for (const o of items) {
      stmt.run({
        id: o.id,
        empresa_id: o.empresa_id,
        sessao_id: o.sessao_id,
        texto: o.texto,
        usuario_id: o.usuario_id,
        criado_em: o.criado_em,
      });
    }
  });
  cacheAll(observacoes);
}

export function registrarProducaoObservacaoLocal(
  db: Database.Database,
  input: ProducaoObservacaoInput,
  usuarioId: string,
): ProducaoObservacao {
  const sessao = db
    .prepare<[string, string], { empresa_id: string }>(
      "SELECT empresa_id FROM sessoes_producao WHERE id = ? AND empresa_id = ?",
    )
    .get(input.sessao_id, getCurrentEmpresaId());
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
