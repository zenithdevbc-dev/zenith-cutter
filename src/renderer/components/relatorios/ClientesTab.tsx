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
import { OrdensPorClienteChart } from "@/components/relatorios/OrdensPorClienteChart";
import { AtividadeClientesChart } from "@/components/relatorios/AtividadeClientesChart";
import { ClienteHistoricoDialog } from "@/components/relatorios/ClienteHistoricoDialog";
import { formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import { paginar, totalPaginas } from "@/lib/pagination";
import {
  FILTROS_CLIENTES_VAZIOS,
  filtrarRelatorioClientes,
  agruparPorCliente,
  formatarMateriaisUsados,
  calcularKpisRelatorioClientes,
  calcularOrdensPorCliente,
  calcularAtividadeClientesPorDia,
  type RelatorioClientesFiltros,
} from "@/lib/relatorioClientes";
import {
  exportarRelatorioClientesCsv,
  exportarRelatorioClientesExcel,
  exportarRelatorioClientesPdf,
} from "@/lib/relatorioClientesExport";
import type { Cliente, RelatorioProducaoLinha, Tecido } from "@shared/models";

interface ClientesTabProps {
  linhas: RelatorioProducaoLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
}

const POR_PAGINA = 20;

/**
 * Relatório de Clientes (para gestores/supervisores) — atividade e
 * volume de produção por cliente num período. Nenhum conceito novo:
 * tudo vem de Ordens de Corte + sessões de produção já existentes
 * (mesma fonte da aba Produção, sem IPC novo). Toda lógica de filtro/
 * agregação vive em lib/relatorioClientes.ts — este componente só
 * recebe dados prontos (buscados em RelatoriosPage) e renderiza.
 */
export function ClientesTab({ linhas, clientes, tecidos }: ClientesTabProps) {
  const [filtros, setFiltros] = useState<RelatorioClientesFiltros>(FILTROS_CLIENTES_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  const filtradas = useMemo(
    () => (linhas ? filtrarRelatorioClientes(linhas, filtros) : []),
    [linhas, filtros],
  );

  const agregado = useMemo(() => agruparPorCliente(filtradas), [filtradas]);
  const kpis = useMemo(
    () => calcularKpisRelatorioClientes(clientes, agregado),
    [clientes, agregado],
  );
  const ordensPorCliente = useMemo(() => calcularOrdensPorCliente(agregado), [agregado]);
  const atividade = useMemo(
    () => calcularAtividadeClientesPorDia(filtradas),
    [filtradas],
  );

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

  function atualizarFiltro<K extends keyof RelatorioClientesFiltros>(
    chave: K,
    valor: RelatorioClientesFiltros[K],
  ) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleExportar(formato: "csv" | "excel" | "pdf") {
    if (agregado.length === 0) {
      toast.error("Nenhum cliente para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      if (formato === "csv") exportarRelatorioClientesCsv(agregado);
      else if (formato === "excel") await exportarRelatorioClientesExcel(agregado);
      else exportarRelatorioClientesPdf(agregado);
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
            <Label htmlFor="clientes-data-inicio">Data início</Label>
            <Input
              id="clientes-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="clientes-data-fim">Data fim</Label>
            <Input
              id="clientes-data-fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Cliente</Label>
            <Select
              value={filtros.clienteId}
              onValueChange={(v) => atualizarFiltro("clienteId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Material</Label>
            <Select
              value={filtros.tecidoId}
              onValueChange={(v) => atualizarFiltro("tecidoId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecidos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.totalClientes}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.clientesAtivos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ordens Produzidas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.ordensProduzidas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Média de Ordens por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.mediaOrdensPorCliente}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ordens por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <OrdensPorClienteChart dados={ordensPorCliente} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Atividade de Clientes ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <AtividadeClientesChart dados={atividade} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {carregando ? "Clientes" : `Clientes (${agregado.length})`}
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
              Nenhum cliente encontrado com os filtros atuais.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ordens</TableHead>
                      <TableHead>Última Ordem</TableHead>
                      <TableHead>Materiais Usados</TableHead>
                      <TableHead>Tempo Médio de Produção</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((linha) => (
                      <TableRow key={linha.cliente_id}>
                        <TableCell className="font-medium">{linha.cliente}</TableCell>
                        <TableCell>{linha.ordens}</TableCell>
                        <TableCell>
                          {new Date(linha.ultimaOrdem).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>{formatarMateriaisUsados(linha.materiaisUsados)}</TableCell>
                        <TableCell>{formatarDuracaoMinutos(linha.tempoMedioMinutos)}</TableCell>
                        <TableCell className="text-right">
                          <ClienteHistoricoDialog
                            clienteId={linha.cliente_id}
                            clienteNome={linha.cliente}
                            todasLinhas={linhas ?? []}
                          />
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
