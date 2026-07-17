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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateOrdemCorteDialog } from "@/components/ordens/CreateOrdemCorteDialog";
import { EditOrdemCorteDialog } from "@/components/ordens/EditOrdemCorteDialog";
import { InfoOrdemCorteDialog } from "@/components/ordens/InfoOrdemCorteDialog";
import { listOrdensCorte, updateOrdemCorte, duplicateOrdemCorte } from "@/lib/ordensCorte";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import { PIPELINE_PRODUCAO, type OrdemCorteResumo, type StatusOrdemCorte } from "@shared/models";

export function OrdensCortePage() {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusOrdemCorte | "todos">("todos");

  useEffect(() => {
    listOrdensCorte()
      .then(setOrdens)
      .catch(() => toast.error("Não foi possível carregar as ordens de corte."));
  }, []);

  function upsertLocal(ordem: OrdemCorteResumo) {
    setOrdens((prev) => {
      if (!prev) return [ordem];
      const idx = prev.findIndex((o) => o.id === ordem.id);
      if (idx === -1) return [ordem, ...prev];
      const next = [...prev];
      next[idx] = ordem;
      return next;
    });
  }

  async function handleCancelar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      const updated = await updateOrdemCorte(ordem.id, { status: "cancelada" }, usuario.id);
      upsertLocal({ ...ordem, ...updated });
      toast.success("Ordem de corte cancelada.");
    } catch {
      toast.error("Não foi possível cancelar a ordem de corte.");
    }
  }

  async function handleDuplicar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      const nova = await duplicateOrdemCorte(ordem.id, usuario.id);
      upsertLocal({
        ...nova,
        cliente_nome: ordem.cliente_nome,
        produto_nome: ordem.produto_nome,
        tecido_nome: ordem.tecido_nome,
        quantidade_total: ordem.quantidade_total,
        mesa_atribuida_nome: null,
      });
      toast.success("Ordem de corte duplicada.");
    } catch {
      toast.error("Não foi possível duplicar a ordem de corte.");
    }
  }

  const filtradas = useMemo(() => {
    if (!ordens) return null;
    const termo = busca.trim().toLowerCase();
    return ordens.filter((o) => {
      // "Aberta" é um filtro agregado (não status literal): qualquer
      // ordem que ainda não terminou nem foi cancelada — cobre
      // aberta/em_fila/em_corte/embalagem/revisao/despacho de uma vez
      // (pedido do usuário, 2026-07-16).
      if (statusFiltro === "aberta") {
        if (o.status === "pronto" || o.status === "cancelada") return false;
      } else if (statusFiltro !== "todos" && o.status !== statusFiltro) {
        return false;
      }
      if (!termo) return true;
      return (
        String(o.numero).includes(termo) ||
        o.cliente_nome.toLowerCase().includes(termo) ||
        o.produto_nome.toLowerCase().includes(termo) ||
        o.tecido_nome.toLowerCase().includes(termo)
      );
    });
  }, [ordens, busca, statusFiltro]);

  return (
    <>
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Ordens de Corte</CardTitle>
        <CreateOrdemCorteDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 gap-2">
          <Input
            placeholder="Pesquisar por número, cliente, produto ou tecido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_fila">Em Fila</SelectItem>
              <SelectItem value="em_corte">Em Corte</SelectItem>
              <SelectItem value="embalagem">Embalagem</SelectItem>
              <SelectItem value="revisao">Revisão</SelectItem>
              <SelectItem value="despacho">Despacho</SelectItem>
              <SelectItem value="pronto">Pronto</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtradas === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem de corte encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tecido</TableHead>
                  <TableHead>Qtd. total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">{ordem.numero}</TableCell>
                    <TableCell>{ordem.cliente_nome}</TableCell>
                    <TableCell>{ordem.produto_nome}</TableCell>
                    <TableCell>{ordem.tecido_nome}</TableCell>
                    <TableCell>{ordem.quantidade_total}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_ORDEM_CORTE_VARIANT[ordem.status]}>
                        {STATUS_ORDEM_CORTE_LABEL[ordem.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <InfoOrdemCorteDialog ordem={ordem} />
                        <Button variant="outline" size="sm" onClick={() => handleDuplicar(ordem)}>
                          Duplicar
                        </Button>
                        {ordem.status !== "cancelada" &&
                          !PIPELINE_PRODUCAO.includes(ordem.status) && (
                          <Button variant="outline" size="sm" onClick={() => handleCancelar(ordem)}>
                            Cancelar
                          </Button>
                        )}
                        <EditOrdemCorteDialog ordem={ordem} onUpdated={upsertLocal} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
    {pinDialog}
    </>
  );
}
