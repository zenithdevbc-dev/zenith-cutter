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
import { listOrdensCorte } from "@/lib/ordensCorte";
import { listMesasComStatus } from "@/lib/producao";
import { useAuth } from "@/lib/auth-context";
import { DbStatusCard } from "@/components/DbStatusCard";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import type { MesaCorteComStatus, OrdemCorteResumo, StatusOrdemCorte } from "@shared/models";

const STATUS_ORDEM: StatusOrdemCorte[] = [
  "aberta",
  "em_fila",
  "em_corte",
  "embalagem",
  "revisao",
  "despacho",
  "pronto",
  "cancelada",
];

/**
 * Dashboard (Sprint 5, todos os papéis — CLAUDE.md 3.6): visão geral
 * de ordens por status e mesas livres/ocupadas. "Ordens por status" e
 * a pesquisa rápida ficam restritas a admin/supervisor (mesma regra
 * de Ordens de Corte — leitura local não passa por RLS, então a
 * restrição de papel precisa acontecer aqui no componente também).
 */
export function DashboardPage() {
  const { usuario } = useAuth();
  const podeVerOrdens =
    usuario?.papel === "administrador" || usuario?.papel === "supervisor";
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (podeVerOrdens) {
      listOrdensCorte()
        .then(setOrdens)
        .catch(() => toast.error("Não foi possível carregar as ordens de corte."));
    }
    listMesasComStatus()
      .then(setMesas)
      .catch(() => toast.error("Não foi possível carregar as mesas de corte."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVerOrdens]);

  const contagemPorStatus = useMemo(() => {
    const contagem: Partial<Record<StatusOrdemCorte, number>> = {};
    for (const ordem of ordens ?? []) {
      contagem[ordem.status] = (contagem[ordem.status] ?? 0) + 1;
    }
    return contagem;
  }, [ordens]);

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
              <p className="text-sm text-muted-foreground">Carregando...</p>
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
              <CardTitle>Ordens por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {ordens === null ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {STATUS_ORDEM.map((status) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span>{STATUS_ORDEM_CORTE_LABEL[status]}</span>
                      <Badge variant={STATUS_ORDEM_CORTE_VARIANT[status]}>
                        {contagemPorStatus[status] ?? 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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

      <DbStatusCard />
      <SyncStatusCard />
    </div>
  );
}
