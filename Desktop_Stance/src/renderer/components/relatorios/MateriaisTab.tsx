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
import { ConsumoMaterialChart } from "@/components/relatorios/ConsumoMaterialChart";
import { MateriaisMaisUsadosChart } from "@/components/relatorios/MateriaisMaisUsadosChart";
import { TendenciaPerdasChart } from "@/components/relatorios/TendenciaPerdasChart";
import {
  FILTROS_MATERIAIS_VAZIOS,
  listarCoresDisponiveis,
  filtrarOrdensRelatorioMateriais,
  filtrarPerdasRelatorioMateriais,
  agruparPorMaterial,
  calcularKpisRelatorioMateriais,
  calcularConsumoPorMaterial,
  calcularMateriaisMaisUsados,
  calcularTendenciaPerdas,
  type RelatorioMateriaisFiltros,
} from "@/lib/relatorioMateriais";
import {
  exportarRelatorioMateriaisCsv,
  exportarRelatorioMateriaisExcel,
  exportarRelatorioMateriaisPdf,
} from "@/lib/relatorioMateriaisExport";
import type { Cliente, OrdemCorteResumo, RelatorioPerdaLinha, Tecido } from "@shared/models";

interface MateriaisTabProps {
  ordens: OrdemCorteResumo[] | null;
  perdas: RelatorioPerdaLinha[] | null;
  clientes: Cliente[];
  tecidos: Tecido[];
}

/**
 * Relatório de Materiais (para gestores/supervisores) — consumo e
 * perdas por material (tecido) num período. KPIs e gráficos redefinidos
 * com dado real do sistema (decisão de 2026-07-16): o pedido original
 * pedia "chapas usadas"/"% de utilização"/"desperdício estimado",
 * conceitos de corte de chapa rígida e de controle de estoque que não
 * existem no domínio de corte de tecido deste projeto — ver CLAUDE.md
 * seção 7. Toda lógica de filtro/agregação vive em
 * lib/relatorioMateriais.ts — este componente só recebe dados prontos
 * (buscados em RelatoriosPage) e renderiza.
 */
export function MateriaisTab({ ordens, perdas, clientes, tecidos }: MateriaisTabProps) {
  const [filtros, setFiltros] = useState<RelatorioMateriaisFiltros>(FILTROS_MATERIAIS_VAZIOS);
  const [exportando, setExportando] = useState(false);

  const tecidosPorId = useMemo(() => new Map(tecidos.map((t) => [t.id, t])), [tecidos]);
  const cores = useMemo(() => listarCoresDisponiveis(tecidos), [tecidos]);

  const ordensFiltradas = useMemo(
    () => (ordens ? filtrarOrdensRelatorioMateriais(ordens, tecidosPorId, filtros) : []),
    [ordens, tecidosPorId, filtros],
  );
  const perdasFiltradas = useMemo(
    () => (perdas ? filtrarPerdasRelatorioMateriais(perdas, tecidosPorId, filtros) : []),
    [perdas, tecidosPorId, filtros],
  );

  const agregado = useMemo(
    () => agruparPorMaterial(ordensFiltradas, perdasFiltradas, tecidosPorId),
    [ordensFiltradas, perdasFiltradas, tecidosPorId],
  );

  const kpis = useMemo(() => calcularKpisRelatorioMateriais(agregado), [agregado]);
  const consumo = useMemo(() => calcularConsumoPorMaterial(agregado), [agregado]);
  const maisUsados = useMemo(() => calcularMateriaisMaisUsados(agregado), [agregado]);
  const tendenciaPerdas = useMemo(
    () => calcularTendenciaPerdas(perdasFiltradas),
    [perdasFiltradas],
  );

  const carregando = ordens === null || perdas === null;

  function atualizarFiltro<K extends keyof RelatorioMateriaisFiltros>(
    chave: K,
    valor: RelatorioMateriaisFiltros[K],
  ) {
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleExportar(formato: "csv" | "excel" | "pdf") {
    if (agregado.length === 0) {
      toast.error("Nenhum material para exportar com os filtros atuais.");
      return;
    }
    setExportando(true);
    try {
      if (formato === "csv") exportarRelatorioMateriaisCsv(agregado);
      else if (formato === "excel") await exportarRelatorioMateriaisExcel(agregado);
      else exportarRelatorioMateriaisPdf(agregado);
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
            <Label htmlFor="materiais-data-inicio">Data início</Label>
            <Input
              id="materiais-data-inicio"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="materiais-data-fim">Data fim</Label>
            <Input
              id="materiais-data-fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
            />
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
            <Label>Cor</Label>
            <Select value={filtros.cor} onValueChange={(v) => atualizarFiltro("cor", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {cores.map((cor) => (
                  <SelectItem key={cor} value={cor}>{cor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Ordens</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.totalOrdens}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total de Peças Produzidas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.totalPecasProduzidas}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total de Perdas Registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.totalPerdasRegistradas}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Material Mais Usado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kpis.materialMaisUsado ?? "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Consumo de Material</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <ConsumoMaterialChart dados={consumo} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Materiais Mais Usados</CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <MateriaisMaisUsadosChart dados={maisUsados} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tendência de Perdas</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <TendenciaPerdasChart dados={tendenciaPerdas} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Materiais</CardTitle>
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
              Nenhum material encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Ordens</TableHead>
                    <TableHead>Peças Produzidas</TableHead>
                    <TableHead>Perdas Registradas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agregado.map((linha) => (
                    <TableRow key={linha.tecido_id}>
                      <TableCell className="font-medium">{linha.material}</TableCell>
                      <TableCell>{linha.cor}</TableCell>
                      <TableCell>{linha.ordens}</TableCell>
                      <TableCell>{linha.pecasProduzidas}</TableCell>
                      <TableCell>{linha.perdasRegistradas}</TableCell>
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
