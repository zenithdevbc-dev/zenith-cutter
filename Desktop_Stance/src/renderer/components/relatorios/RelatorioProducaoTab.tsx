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
import {
  STATUS_ORDEM_CORTE_LABEL,
  STATUS_ORDEM_CORTE_VARIANT,
} from "@/lib/statusOrdemCorte";
import {
  FILTROS_RELATORIO_VAZIOS,
  filtrarRelatorioProducao,
  calcularKpisRelatorioProducao,
  calcularTempoProducaoMinutos,
  formatarDuracaoMinutos,
  type RelatorioProducaoFiltros,
} from "@/lib/relatorioProducao";
import {
  exportarRelatorioProducaoCsv,
  exportarRelatorioProducaoExcel,
  exportarRelatorioProducaoPdf,
} from "@/lib/relatorioExport";
import type {
  Cliente,
  RelatorioProducaoLinha,
  StatusOrdemCorte,
  Tecido,
  Usuario,
} from "@shared/models";

const STATUS_OPCOES: StatusOrdemCorte[] = [
  "planejado",
  "em_fila",
  "enfesto",
  "corte",
  "embalagem",
  "despacho",
  "pronto",
  "cancelada",
];

interface RelatorioProducaoTabProps {
  linhas: RelatorioProducaoLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
  usuarios: Usuario[];
}

/**
 * Relatório de Produção (para gestores/supervisores) — visão geral da
 * produção num período: filtros, KPIs e tabela detalhada, com
 * exportação para CSV/Excel/PDF. Toda a lógica de filtro/cálculo vive
 * em lib/relatorioProducao.ts e lib/relatorioExport.ts — este
 * componente só recebe dados prontos (buscados em RelatoriosPage) e
 * renderiza.
 */
export function RelatorioProducaoTab({
  linhas,
  clientes,
  tecidos,
  usuarios,
}: RelatorioProducaoTabProps) {
  const [filtros, setFiltros] = useState<RelatorioProducaoFiltros>(FILTROS_RELATORIO_VAZIOS);
  const [exportando, setExportando] = useState(false);

  const filtradas = useMemo(
    () => (linhas ? filtrarRelatorioProducao(linhas, filtros) : []),
    [linhas, filtros],
  );

  const kpis = useMemo(() => calcularKpisRelatorioProducao(filtradas), [filtradas]);

  function atualizarFiltro<K extends keyof RelatorioProducaoFiltros>(
    chave: K,
    valor: RelatorioProducaoFiltros[K],
  ) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleExportar(formato: "csv" | "excel" | "pdf") {
    if (filtradas.length === 0) {
      toast.error("Nenhuma ordem para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      if (formato === "csv") exportarRelatorioProducaoCsv(filtradas);
      else if (formato === "excel") await exportarRelatorioProducaoExcel(filtradas);
      else exportarRelatorioProducaoPdf(filtradas, kpis);
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
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="producao-data-inicio">Data início</Label>
            <Input
              id="producao-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="producao-data-fim">Data fim</Label>
            <Input
              id="producao-data-fim"
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
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Peças</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.totalPecas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Peças Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.pecasConcluidas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Peças em Andamento</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.pecasEmAndamento}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.atrasadas}</CardContent>
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Ordens</CardTitle>
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
          {linhas === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ordem encontrada com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Conclusão</TableHead>
                    <TableHead>Tempo de Produção</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((linha) => (
                    <TableRow key={linha.ordem_id}>
                      <TableCell className="font-medium">{linha.numero}</TableCell>
                      <TableCell>{linha.cliente_nome}</TableCell>
                      <TableCell>{linha.tecido_nome}</TableCell>
                      <TableCell>{linha.operador_nome ?? "—"}</TableCell>
                      <TableCell>
                        {linha.iniciado_em
                          ? new Date(linha.iniciado_em).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {linha.finalizado_em
                          ? new Date(linha.finalizado_em).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {formatarDuracaoMinutos(calcularTempoProducaoMinutos(linha))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_ORDEM_CORTE_VARIANT[linha.status]}>
                          {STATUS_ORDEM_CORTE_LABEL[linha.status]}
                        </Badge>
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
