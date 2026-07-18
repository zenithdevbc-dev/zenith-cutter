import { PIPELINE_PRODUCAO, type OrdemCorteResumo, type RelatorioProducaoLinha } from "@shared/models";
import { isOrdemAtrasada } from "@/lib/relatorioProducao";

export function saudacaoPorHorario(agora: Date = new Date()): string {
  const hora = agora.getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

interface ResumoProducaoParams {
  mesasTotal: number;
  mesasOcupadas: number;
  /** Omitido (undefined) = papel sem acesso a Ordens de Corte (Operador) — resumo fica só nas mesas. */
  ordens?: OrdemCorteResumo[];
  producao?: RelatorioProducaoLinha[];
  agora?: Date;
}

/**
 * Resumo em linguagem natural pro card "inteligente" do Dashboard
 * (pedido do usuário, 2026-07-16): saudação por horário + destaques da
 * produção do momento. Nenhum dado novo — só lê o que o Dashboard já
 * busca (mesas/ordens/produção) e narra em frases curtas, sem virar
 * lista de KPI.
 */
export function gerarResumoProducao(params: ResumoProducaoParams): string {
  const agora = params.agora ?? new Date();
  const saudacao = saudacaoPorHorario(agora);
  const mesasLivres = params.mesasTotal - params.mesasOcupadas;

  const frases: string[] = [];

  if (params.mesasTotal === 0) {
    frases.push(`${saudacao}! Ainda não há mesas de corte cadastradas.`);
  } else if (params.mesasOcupadas === 0) {
    frases.push(
      `${saudacao}! Todas as ${params.mesasTotal} mesas de corte estão livres no momento.`,
    );
  } else {
    const trechoLivres = mesasLivres === 0 ? "nenhuma livre" : `${mesasLivres} livre${mesasLivres === 1 ? "" : "s"}`;
    frases.push(
      `${saudacao}! Das ${params.mesasTotal} mesas de corte, ${params.mesasOcupadas} ${
        params.mesasOcupadas === 1 ? "está" : "estão"
      } em uso e ${trechoLivres}.`,
    );
  }

  if (params.ordens) {
    const pecasEmAndamento = params.ordens
      .filter((o) => PIPELINE_PRODUCAO.includes(o.status) && o.status !== "pronto")
      .reduce((soma, o) => soma + o.quantidade_total, 0);
    const pecasNaFila = params.ordens
      .filter((o) => o.status === "em_fila")
      .reduce((soma, o) => soma + o.quantidade_total, 0);

    if (pecasEmAndamento > 0 || pecasNaFila > 0) {
      const partes: string[] = [];
      if (pecasEmAndamento > 0) {
        partes.push(`${pecasEmAndamento} peça${pecasEmAndamento === 1 ? "" : "s"} em produção`);
      }
      if (pecasNaFila > 0) {
        partes.push(`${pecasNaFila} aguardando na fila`);
      }
      frases.push(`No momento, há ${partes.join(" e ")}.`);
    } else {
      frases.push("Nenhuma peça em produção no momento — tudo tranquilo por aqui.");
    }
  }

  if (params.producao) {
    const hojeISO = agora.toISOString().slice(0, 10);
    const pecasHoje = params.producao
      .filter((p) => p.finalizado_em && p.finalizado_em.slice(0, 10) === hojeISO)
      .reduce((soma, p) => soma + p.quantidade_total, 0);
    if (pecasHoje > 0) {
      frases.push(
        `Hoje já ${pecasHoje === 1 ? "foi produzida" : "foram produzidas"} ${pecasHoje} peça${
          pecasHoje === 1 ? "" : "s"
        }.`,
      );
    }

    const atrasadas = params.producao.filter((p) => isOrdemAtrasada(p, hojeISO)).length;
    if (atrasadas > 0) {
      frases.push(
        `Atenção: ${atrasadas} ordem${atrasadas === 1 ? "" : "s"} ${
          atrasadas === 1 ? "está" : "estão"
        } com o prazo vencido.`,
      );
    }
  }

  return frases.join(" ");
}
