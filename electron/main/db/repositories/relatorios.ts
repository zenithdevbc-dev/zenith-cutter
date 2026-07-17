import type Database from "better-sqlite3";
import type { RelatorioProducaoLinha } from "../../../../src/shared/models";

/**
 * Uma linha por ordem, com a sessão de produção mais recente dela
 * (subquery — uma ordem tem no máximo uma sessão na prática, mas a
 * consulta não depende dessa suposição). Sem filtro de período/status
 * aqui: a página de Relatórios busca tudo uma vez e filtra em memória
 * no renderer (mesmo padrão de OrdensCortePage/DashboardPage — volume
 * de dados de uma única empresa não justifica filtro no SQL).
 */
export function listRelatorioProducaoLocal(db: Database.Database): RelatorioProducaoLinha[] {
  return db
    .prepare<[], RelatorioProducaoLinha>(`
      SELECT
        oc.id AS ordem_id,
        oc.numero,
        oc.cliente_id,
        c.nome AS cliente_nome,
        oc.tecido_id,
        t.nome AS tecido_nome,
        oc.status,
        oc.prazo,
        oc.criado_em,
        sp.iniciado_por AS operador_id,
        u.nome AS operador_nome,
        sp.iniciado_em,
        sp.finalizado_em,
        COALESCE(sp.tempo_pausado_segundos, 0) AS tempo_pausado_segundos
      FROM ordens_corte oc
      JOIN clientes c ON c.id = oc.cliente_id
      JOIN tecidos t ON t.id = oc.tecido_id
      LEFT JOIN sessoes_producao sp ON sp.id = (
        SELECT id FROM sessoes_producao WHERE ordem_id = oc.id ORDER BY iniciado_em DESC LIMIT 1
      )
      LEFT JOIN usuarios u ON u.id = sp.iniciado_por
      ORDER BY oc.numero DESC
    `)
    .all();
}
