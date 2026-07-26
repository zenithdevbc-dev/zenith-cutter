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
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { EtapaMultiSelect } from "@/components/ordens/EtapaMultiSelect";
import { listOrdensCorte, updateOrdemCorte, duplicateOrdemCorte, arquivarOrdem } from "@/lib/ordensCorte";
import { listClientes } from "@/lib/clientes";
import { listProdutos } from "@/lib/produtos";
import { listTecidos } from "@/lib/tecidos";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import { PIPELINE_PRODUCAO, type Cliente, type OrdemCorteResumo, type Produto, type StatusOrdemCorte, type Tecido } from "@shared/models";

export function OrdensCortePage() {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);

  const [busca, setBusca] = useState("");
  const [etapas, setEtapas] = useState<StatusOrdemCorte[]>([]);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteId, setClienteId] = useState("todos");
  const [tecidoId, setTecidoId] = useState("todos");
  const [produtoId, setProdutoId] = useState("todos");

  useEffect(() => {
    listOrdensCorte()
      .then(setOrdens)
      .catch(() => toast.error("Não foi possível carregar as ordens de corte."));
    listClientes()
      .then((c) => setClientes(c.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os clientes."));
    listProdutos()
      .then((p) => setProdutos(p.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os produtos."));
    listTecidos()
      .then((t) => setTecidos(t.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os materiais."));
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

  async function handleArquivar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      const updated = await arquivarOrdem(ordem.id, usuario.id);
      upsertLocal({ ...ordem, ...updated });
      toast.success("Ordem de corte arquivada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível arquivar a ordem de corte.");
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
        banca_nome: null,
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
      // Arquivada some de todo filtro, exceto quando "Mostrar
      // arquivadas" está ligado (decisão de 2026-07-26 — o objetivo de
      // arquivar é sumir da lista padrão, não só marcar).
      if (mostrarArquivadas) {
        if (!o.arquivada) return false;
      } else {
        if (o.arquivada) return false;
        if (etapas.length > 0 && !etapas.includes(o.status)) return false;
      }
      if (clienteId !== "todos" && o.cliente_id !== clienteId) return false;
      if (produtoId !== "todos" && o.produto_id !== produtoId) return false;
      if (tecidoId !== "todos" && o.tecido_id !== tecidoId) return false;
      const dataCriacao = o.criado_em.slice(0, 10);
      if (dataInicio && dataCriacao < dataInicio) return false;
      if (dataFim && dataCriacao > dataFim) return false;
      if (!termo) return true;
      return (
        String(o.numero).includes(termo) ||
        o.cliente_nome.toLowerCase().includes(termo) ||
        o.produto_nome.toLowerCase().includes(termo) ||
        o.tecido_nome.toLowerCase().includes(termo)
      );
    });
  }, [ordens, busca, etapas, mostrarArquivadas, clienteId, produtoId, tecidoId, dataInicio, dataFim]);

  return (
    <>
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Ordens de Corte</CardTitle>
        <CreateOrdemCorteDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 lg:col-span-2">
            <Label htmlFor="ordens-busca">Buscar</Label>
            <Input
              id="ordens-busca"
              placeholder="Pesquisar por número, cliente, produto ou material..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Etapa</Label>
            <EtapaMultiSelect selecionadas={etapas} onChange={setEtapas} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
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
            <Label>Produto</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Material</Label>
            <Select value={tecidoId} onValueChange={setTecidoId}>
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
            <Label htmlFor="ordens-data-inicio">Data início</Label>
            <Input
              id="ordens-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ordens-data-fim">Data fim</Label>
            <Input
              id="ordens-data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <Switch
              id="ordens-mostrar-arquivadas"
              checked={mostrarArquivadas}
              onCheckedChange={setMostrarArquivadas}
            />
            <Label htmlFor="ordens-mostrar-arquivadas">Mostrar arquivadas</Label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtradas === null ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Qtd. total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableSkeletonRows columns={7} />
            </Table>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem de corte encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Material</TableHead>
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
                        {ordem.status === "cancelada" && !ordem.arquivada && (
                          <Button variant="outline" size="sm" onClick={() => handleArquivar(ordem)}>
                            Arquivar
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
