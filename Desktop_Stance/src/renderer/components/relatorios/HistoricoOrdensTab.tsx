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
import { InfoOrdemCorteDialog } from "@/components/ordens/InfoOrdemCorteDialog";
import {
  STATUS_ORDEM_CORTE_LABEL,
  STATUS_ORDEM_CORTE_VARIANT,
} from "@/lib/statusOrdemCorte";
import {
  FILTROS_HISTORICO_VAZIOS,
  filtrarHistoricoOrdens,
  type OrdemHistoricoLinha,
  type HistoricoOrdensFiltros,
} from "@/lib/historicoOrdens";
import { paginar, totalPaginas } from "@/lib/pagination";
import {
  exportarHistoricoOrdensCsv,
  exportarHistoricoOrdensExcel,
  exportarHistoricoOrdensPdf,
} from "@/lib/historicoOrdensExport";
import type { Cliente, StatusOrdemCorte, Tecido, Usuario } from "@shared/models";

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

const POR_PAGINA = 20;

interface HistoricoOrdensTabProps {
  linhas: OrdemHistoricoLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
  usuarios: Usuario[];
}

/**
 * Histórico de Ordens — busca/análise de toda ordem já registrada
 * (tela de consulta principal, pedido do usuário 2026-07-16). Filtros
 * combináveis, busca instantânea (dados já estão em memória — sem
 * round-trip de rede), paginação no cliente e exportação CSV/Excel/
 * PDF. Detalhe completo por linha reusa o mesmo InfoOrdemCorteDialog
 * já usado em Ordens de Corte. Toda lógica de filtro/paginação vive em
 * lib/historicoOrdens.ts — este componente só recebe dados prontos e
 * renderiza.
 */
export function HistoricoOrdensTab({
  linhas,
  clientes,
  tecidos,
  usuarios,
}: HistoricoOrdensTabProps) {
  const [filtros, setFiltros] = useState<HistoricoOrdensFiltros>(FILTROS_HISTORICO_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  const filtradas = useMemo(
    () => (linhas ? filtrarHistoricoOrdens(linhas, filtros) : []),
    [linhas, filtros],
  );

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const paginas = totalPaginas(filtradas.length, POR_PAGINA);
  const paginaAtual = Math.min(pagina, paginas);
  const visiveis = useMemo(
    () => paginar(filtradas, paginaAtual, POR_PAGINA),
    [filtradas, paginaAtual],
  );

  function atualizarFiltro<K extends keyof HistoricoOrdensFiltros>(
    chave: K,
    valor: HistoricoOrdensFiltros[K],
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
      if (formato === "csv") exportarHistoricoOrdensCsv(filtradas);
      else if (formato === "excel") await exportarHistoricoOrdensExcel(filtradas);
      else exportarHistoricoOrdensPdf(filtradas);
    } catch {
      toast.error("Não foi possível exportar o histórico.");
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
            <Label htmlFor="historico-numero">Número da ordem</Label>
            <Input
              id="historico-numero"
              placeholder="Buscar por número..."
              value={filtros.numero}
              onChange={(e) => atualizarFiltro("numero", e.target.value)}
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
            <Label htmlFor="historico-data-inicio">Data início</Label>
            <Input
              id="historico-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="historico-data-fim">Data fim</Label>
            <Input
              id="historico-data-fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {linhas === null ? "Ordens" : `Ordens (${filtradas.length})`}
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
          {linhas === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ordem encontrada com os filtros atuais.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Peças</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Conclusão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((linha) => (
                      <TableRow key={linha.id}>
                        <TableCell className="font-medium">{linha.numero}</TableCell>
                        <TableCell>{linha.cliente_nome}</TableCell>
                        <TableCell>{linha.tecido_nome}</TableCell>
                        <TableCell>{linha.quantidade_total}</TableCell>
                        <TableCell>
                          {new Date(linha.criado_em).toLocaleDateString("pt-BR")}
                        </TableCell>
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
                          <Badge variant={STATUS_ORDEM_CORTE_VARIANT[linha.status]}>
                            {STATUS_ORDEM_CORTE_LABEL[linha.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <InfoOrdemCorteDialog ordem={linha} />
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
