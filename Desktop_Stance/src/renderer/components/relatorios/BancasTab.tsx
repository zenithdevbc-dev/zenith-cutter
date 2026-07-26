import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { PecasPorBancaChart } from "@/components/relatorios/PecasPorBancaChart";
import { AtividadeBancasChart } from "@/components/relatorios/AtividadeBancasChart";
import { paginar, totalPaginas } from "@/lib/pagination";
import {
  FILTROS_BANCAS_VAZIOS,
  filtrarRelatorioBancas,
  agruparPorBanca,
  calcularKpisRelatorioBancas,
  calcularPecasPorBanca,
  calcularAtividadeBancasPorDia,
  type RelatorioBancasFiltros,
} from "@/lib/relatorioBancas";
import {
  exportarRelatorioBancasCsv,
  exportarRelatorioBancasExcel,
  exportarRelatorioBancasPdf,
} from "@/lib/relatorioBancasExport";
import type { Banca, RelatorioProducaoLinha } from "@shared/models";

interface BancasTabProps {
  linhas: RelatorioProducaoLinha[] | null;
  bancas: Banca[];
}

const POR_PAGINA = 20;

/**
 * Relatório de Bancas (para gestores/supervisores) — atividade e
 * volume de produção por banca terceirizada num período. Reaproveita a
 * mesma fonte de dados da aba Produção (`RelatorioProducaoLinha`, já
 * carrega banca_id/banca_nome), sem IPC novo. Diferente das outras
 * abas de entidade: a tabela mostra toda banca CADASTRADA (mesmo sem
 * nenhuma ordem ainda), não só quem teve atividade no período — ver
 * lib/relatorioBancas.ts.
 */
export function BancasTab({ linhas, bancas }: BancasTabProps) {
  const [filtros, setFiltros] = useState<RelatorioBancasFiltros>(FILTROS_BANCAS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  const filtradas = useMemo(
    () => (linhas ? filtrarRelatorioBancas(linhas, filtros) : []),
    [linhas, filtros],
  );

  const bancasFiltradasPorStatus = useMemo(() => {
    if (filtros.status === "ativas") return bancas.filter((b) => b.ativo);
    if (filtros.status === "inativas") return bancas.filter((b) => !b.ativo);
    return bancas;
  }, [bancas, filtros.status]);

  const agregado = useMemo(
    () => agruparPorBanca(filtradas, bancasFiltradasPorStatus),
    [filtradas, bancasFiltradasPorStatus],
  );
  const kpis = useMemo(
    () => calcularKpisRelatorioBancas(bancas, agregado),
    [bancas, agregado],
  );
  const pecasPorBanca = useMemo(() => calcularPecasPorBanca(agregado), [agregado]);
  const atividade = useMemo(() => calcularAtividadeBancasPorDia(filtradas), [filtradas]);

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const paginas = totalPaginas(agregado.length, POR_PAGINA);
  const paginaAtual = Math.min(pagina, paginas);
  const visiveis = useMemo(
    () => paginar(agregado, paginaAtual, POR_PAGINA),
    [agregado, paginaAtual],
  );

  const carregando = linhas === null;

  function atualizarFiltro<K extends keyof RelatorioBancasFiltros>(
    chave: K,
    valor: RelatorioBancasFiltros[K],
  ) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleExportar(formato: "csv" | "excel" | "pdf") {
    if (agregado.length === 0) {
      toast.error("Nenhum terceiro para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      if (formato === "csv") exportarRelatorioBancasCsv(agregado);
      else if (formato === "excel") await exportarRelatorioBancasExcel(agregado);
      else exportarRelatorioBancasPdf(agregado);
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
            <Label htmlFor="bancas-data-inicio">Data início</Label>
            <Input
              id="bancas-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="bancas-data-fim">Data fim</Label>
            <Input
              id="bancas-data-fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Terceiro</Label>
            <Select
              value={filtros.bancaId}
              onValueChange={(v) => atualizarFiltro("bancaId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {bancas.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Status</Label>
            <Select
              value={filtros.status}
              onValueChange={(v) => atualizarFiltro("status", v as RelatorioBancasFiltros["status"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativas">Ativas</SelectItem>
                <SelectItem value="inativas">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Terceiros</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.totalBancas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Terceiros Ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.bancasAtivas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Peças Produzidas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.pecasProduzidas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Média de Peças por Terceiro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.mediaPecasPorBanca}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Peças por Terceiro</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <PecasPorBancaChart dados={pecasPorBanca} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Atividade ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <AtividadeBancasChart dados={atividade} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {carregando ? "Terceiros" : `Terceiros (${agregado.length})`}
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
        <CardContent className="flex flex-col gap-3">
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : agregado.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum terceiro encontrado com os filtros atuais.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terceiro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Peças</TableHead>
                      <TableHead>Última Atividade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((linha) => (
                      <TableRow key={linha.banca_id}>
                        <TableCell className="font-medium">{linha.banca}</TableCell>
                        <TableCell>
                          <Badge variant={linha.ativo ? "secondary" : "destructive"}>
                            {linha.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>{linha.pecas}</TableCell>
                        <TableCell>
                          {linha.ultimaAtividade
                            ? new Date(linha.ultimaAtividade).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {paginaAtual} de {paginas}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPagina((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paginaAtual >= paginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
