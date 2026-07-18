import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PecasPorOperadorChart } from "@/components/relatorios/PecasPorOperadorChart";
import { ComparacaoTempoProducaoChart } from "@/components/relatorios/ComparacaoTempoProducaoChart";
import { ProdutividadeDiariaChart } from "@/components/relatorios/ProdutividadeDiariaChart";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import { formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import {
  FILTROS_OPERADORES_VAZIOS,
  listarOperadoresDisponiveis,
  filtrarRelatorioOperadores,
  agruparPorOperador,
  calcularKpisRelatorioOperadores,
  calcularPecasPorOperador,
  calcularComparacaoTempoProducao,
  calcularProdutividadeDiaria,
  type RelatorioOperadoresFiltros,
} from "@/lib/relatorioOperadores";
import {
  exportarRelatorioOperadoresCsv,
  exportarRelatorioOperadoresExcel,
  exportarRelatorioOperadoresPdf,
} from "@/lib/relatorioOperadoresExport";
import type { RelatorioProducaoLinha, StatusOrdemCorte } from "@shared/models";

const STATUS_OPCOES: StatusOrdemCorte[] = [
  "aberta",
  "em_fila",
  "em_corte",
  "embalagem",
  "revisao",
  "despacho",
  "pronto",
  "cancelada",
];

interface OperadoresTabProps {
  linhas: RelatorioProducaoLinha[] | null;
}

/**
 * Relatório de Operadores (para gestão de produção) — produtividade e
 * carga de trabalho por operador num período. Só usa dado de produção
 * já existente (mesma fonte da aba Produção, sem IPC novo); nenhuma
 * feature de gestão de pessoas/RH — só análise operacional. Toda
 * lógica de filtro/agregação vive em lib/relatorioOperadores.ts — este
 * componente só recebe dados prontos (buscados em RelatoriosPage) e
 * renderiza.
 */
export function OperadoresTab({ linhas }: OperadoresTabProps) {
  const [filtros, setFiltros] = useState<RelatorioOperadoresFiltros>(FILTROS_OPERADORES_VAZIOS);
  const [exportando, setExportando] = useState(false);

  const operadoresDisponiveis = useMemo(
    () => listarOperadoresDisponiveis(linhas ?? []),
    [linhas],
  );

  const filtradas = useMemo(
    () => (linhas ? filtrarRelatorioOperadores(linhas, filtros) : []),
    [linhas, filtros],
  );

  const agregado = useMemo(() => agruparPorOperador(filtradas), [filtradas]);
  const kpis = useMemo(
    () => calcularKpisRelatorioOperadores(linhas ?? [], filtradas, agregado),
    [linhas, filtradas, agregado],
  );
  const pecasPorOperador = useMemo(() => calcularPecasPorOperador(agregado), [agregado]);
  const comparacaoTempo = useMemo(() => calcularComparacaoTempoProducao(agregado), [agregado]);
  const produtividadeDiaria = useMemo(
    () => calcularProdutividadeDiaria(filtradas),
    [filtradas],
  );

  const carregando = linhas === null;

  function atualizarFiltro<K extends keyof RelatorioOperadoresFiltros>(
    chave: K,
    valor: RelatorioOperadoresFiltros[K],
  ) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleExportar(formato: "csv" | "excel" | "pdf") {
    if (agregado.length === 0) {
      toast.error("Nenhum operador para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      if (formato === "csv") exportarRelatorioOperadoresCsv(agregado);
      else if (formato === "excel") await exportarRelatorioOperadoresExcel(agregado);
      else exportarRelatorioOperadoresPdf(agregado);
    } catch {
      toast.error("Não foi possível exportar o relatório.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="operadores-data-inicio">Data início</Label>
            <Input
              id="operadores-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="operadores-data-fim">Data fim</Label>
            <Input
              id="operadores-data-fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Operador</Label>
            <Select
              value={filtros.operadorId}
              onValueChange={(v) => atualizarFiltro("operadorId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {operadoresDisponiveis.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Status</Label>
            <Select
              value={filtros.status}
              onValueChange={(v) => atualizarFiltro("status", v as typeof filtros.status)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_ORDEM_CORTE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Operadores</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.totalOperadores}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Peças Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.pecasConcluidas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Tempo Médio de Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatarDuracaoMinutos(kpis.tempoMedioMinutos)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Média de Peças por Operador
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.mediaPecasPorOperador}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peças por Operador</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <PecasPorOperadorChart dados={pecasPorOperador} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comparação de Tempo de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <ComparacaoTempoProducaoChart dados={comparacaoTempo} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Produtividade Diária</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ProdutividadeDiariaChart dados={produtividadeDiaria} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {carregando ? "Operadores" : `Operadores (${agregado.length})`}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exportando}
              onClick={() => handleExportar("csv")}
            >
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exportando}
              onClick={() => handleExportar("excel")}
            >
              Exportar Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exportando}
              onClick={() => handleExportar("pdf")}
            >
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : agregado.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum operador encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Peças Concluídas</TableHead>
                    <TableHead>Peças em Andamento</TableHead>
                    <TableHead>Tempo Médio de Produção</TableHead>
                    <TableHead>Última Atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agregado.map((linha) => (
                    <TableRow key={linha.operador_id}>
                      <TableCell className="font-medium">{linha.operador}</TableCell>
                      <TableCell>{linha.pecasConcluidas}</TableCell>
                      <TableCell>{linha.pecasEmAndamento}</TableCell>
                      <TableCell>{formatarDuracaoMinutos(linha.tempoMedioMinutos)}</TableCell>
                      <TableCell>
                        {linha.ultimaAtividade
                          ? new Date(linha.ultimaAtividade).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
