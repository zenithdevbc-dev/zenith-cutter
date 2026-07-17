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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listOrdensCorte } from "@/lib/ordensCorte";
import { listMesasComStatus } from "@/lib/producao";
import { listRelatorioProducao } from "@/lib/relatorios";
import { useAuth } from "@/lib/auth-context";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import {
  calcularDistribuicaoStatus,
  calcularProducaoUltimos30Dias,
} from "@/lib/dashboardCharts";
import { ProducaoUltimos30DiasChart } from "@/components/dashboard/ProducaoUltimos30DiasChart";
import { DistribuicaoStatusChart } from "@/components/dashboard/DistribuicaoStatusChart";
import type {
  MesaCorteComStatus,
  OrdemCorteResumo,
  RelatorioProducaoLinha,
} from "@shared/models";

/**
 * Dashboard (Sprint 5, todos os papéis — CLAUDE.md 3.6): visão geral
 * de mesas livres/ocupadas, distribuição de ordens por status (gráfico
 * de rosca), produção dos últimos 30 dias (gráfico de barras, decisão
 * de 2026-07-16 — biblioteca `recharts`, ver seção 2) e pesquisa
 * rápida. Tudo além de mesas fica restrito a admin/supervisor (mesma
 * regra de Ordens de Corte — leitura local não passa por RLS, então a
 * restrição de papel precisa acontecer aqui no componente também).
 */
export function DashboardPage() {
  const { usuario } = useAuth();
  const podeVerOrdens =
    usuario?.papel === "administrador" || usuario?.papel === "supervisor";
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [producao, setProducao] = useState<RelatorioProducaoLinha[] | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (podeVerOrdens) {
      listOrdensCorte()
        .then(setOrdens)
        .catch(() => toast.error("Não foi possível carregar as ordens de corte."));
      listRelatorioProducao()
        .then(setProducao)
        .catch(() => toast.error("Não foi possível carregar os dados de produção."));
    }
    listMesasComStatus()
      .then(setMesas)
      .catch(() => toast.error("Não foi possível carregar as mesas de corte."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerOrdens]);

  const distribuicaoStatus = useMemo(
    () => calcularDistribuicaoStatus(ordens ?? []),
    [ordens],
  );

  const producaoUltimos30Dias = useMemo(
    () => calcularProducaoUltimos30Dias(producao ?? []),
    [producao],
  );

  const resultadosBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo || !ordens) return [];
    return ordens
      .filter(
        (o) =>
          String(o.numero).includes(termo) ||
          o.cliente_nome.toLowerCase().includes(termo) ||
          o.produto_nome.toLowerCase().includes(termo) ||
          o.tecido_nome.toLowerCase().includes(termo),
      )
      .slice(0, 20);
  }, [ordens, busca]);

  const mesasLivres = (mesas ?? []).filter((m) => m.ativo && !m.ocupada).length;
  const mesasOcupadas = (mesas ?? []).filter((m) => m.ativo && m.ocupada).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mesas de Corte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {mesas === null ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : mesas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma mesa de corte cadastrada.</p>
            ) : (
              <>
                <div className="flex gap-4 text-sm">
                  <span>
                    <Badge variant="secondary">{mesasLivres}</Badge> livre(s)
                  </span>
                  <span>
                    <Badge variant="destructive">{mesasOcupadas}</Badge> ocupada(s)
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {mesas
                    .filter((m) => m.ativo)
                    .map((mesa) => (
                      <div key={mesa.id} className="flex items-center justify-between text-sm">
                        <span>{mesa.nome}</span>
                        <Badge variant={mesa.ocupada ? "destructive" : "secondary"}>
                          {mesa.ocupada
                            ? `Ocupada (Nº ${mesa.ordem_numero})`
                            : "Livre"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {podeVerOrdens && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Ordens por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {ordens === null ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="size-32 shrink-0 rounded-full" />
                  <div className="flex w-full flex-col gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : distribuicaoStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ordem cadastrada.</p>
              ) : (
                <DistribuicaoStatusChart dados={distribuicaoStatus} />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {podeVerOrdens && (
        <Card>
          <CardHeader>
            <CardTitle>Produção dos Últimos 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            {producao === null ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ProducaoUltimos30DiasChart dados={producaoUltimos30Dias} />
            )}
          </CardContent>
        </Card>
      )}

      {podeVerOrdens && (
        <Card>
          <CardHeader>
            <CardTitle>Pesquisa rápida</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              placeholder="Buscar por número, cliente, produto ou tecido..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca.trim() && (
              resultadosBusca.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma ordem encontrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadosBusca.map((ordem) => (
                      <TableRow key={ordem.id}>
                        <TableCell className="font-medium">{ordem.numero}</TableCell>
                        <TableCell>{ordem.cliente_nome}</TableCell>
                        <TableCell>{ordem.produto_nome}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_ORDEM_CORTE_VARIANT[ordem.status]}>
                            {STATUS_ORDEM_CORTE_LABEL[ordem.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
