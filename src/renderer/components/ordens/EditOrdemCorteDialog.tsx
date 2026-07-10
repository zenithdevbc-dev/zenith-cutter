import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listClientes } from "@/lib/clientes";
import { listProdutos } from "@/lib/produtos";
import { listTecidos } from "@/lib/tecidos";
import { listProdutoTamanhos } from "@/lib/produtoTamanhos";
import { listOrdemCorteItens, updateOrdemCorte } from "@/lib/ordensCorte";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import type {
  Cliente,
  Produto,
  Tecido,
  ProdutoTamanho,
  OrdemCorteResumo,
  StatusOrdemCorte,
} from "@shared/models";

interface EditOrdemCorteDialogProps {
  ordem: OrdemCorteResumo;
  onUpdated: (ordem: OrdemCorteResumo) => void;
}

const STATUS_LABEL: Record<StatusOrdemCorte, string> = {
  aberta: "Aberta",
  em_fila: "Em Fila",
  cancelada: "Cancelada",
};

export function EditOrdemCorteDialog({ ordem, onUpdated }: EditOrdemCorteDialogProps) {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [clienteId, setClienteId] = useState(ordem.cliente_id);
  const [produtoId, setProdutoId] = useState(ordem.produto_id);
  const [tecidoId, setTecidoId] = useState(ordem.tecido_id);
  const [observacoes, setObservacoes] = useState(ordem.observacoes ?? "");
  const [status, setStatus] = useState<StatusOrdemCorte>(ordem.status);
  const [grade, setGrade] = useState<ProdutoTamanho[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([listClientes(), listProdutos(), listTecidos()])
      .then(([c, p, t]) => {
        setClientes(c.filter((x) => x.ativo));
        setProdutos(p.filter((x) => x.ativo));
        setTecidos(t.filter((x) => x.ativo));
      })
      .catch(() => toast.error("Não foi possível carregar clientes/produtos/tecidos."));
  }, [open]);

  useEffect(() => {
    if (!open || !produtoId) return;
    Promise.all([listProdutoTamanhos(produtoId), listOrdemCorteItens(ordem.id)])
      .then(([tamanhos, itensAtuais]) => {
        const ativos = tamanhos.filter((t) => t.ativo);
        setGrade(ativos);
        setQuantidades((prev) => {
          const next: Record<string, string> = {};
          for (const t of ativos) {
            const existente = itensAtuais.find((i) => i.produto_tamanho_id === t.id);
            next[t.id] = prev[t.id] ?? (existente ? String(existente.quantidade) : "");
          }
          return next;
        });
      })
      .catch(() => toast.error("Não foi possível carregar a grade do produto."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtoId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario || !clienteId || !produtoId || !tecidoId) return;

    const itens = grade
      .map((t) => ({ produto_tamanho_id: t.id, quantidade: Number(quantidades[t.id] || 0) }))
      .filter((i) => i.quantidade > 0);

    if (itens.length === 0) {
      setError("Informe a quantidade de ao menos um tamanho da grade.");
      return;
    }

    if (!(await confirmPin())) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateOrdemCorte(
        ordem.id,
        {
          cliente_id: clienteId,
          produto_id: produtoId,
          tecido_id: tecidoId,
          observacoes: observacoes || null,
          status,
          itens,
        },
        usuario.id,
      );
      const cliente = clientes.find((c) => c.id === clienteId);
      const produto = produtos.find((p) => p.id === produtoId);
      const tecido = tecidos.find((t) => t.id === tecidoId);
      const quantidade_total = itens.reduce((sum, i) => sum + i.quantidade, 0);
      toast.success("Ordem de corte atualizada.");
      onUpdated({
        ...updated,
        cliente_nome: cliente?.nome ?? ordem.cliente_nome,
        produto_nome: produto?.nome ?? ordem.produto_nome,
        tecido_nome: tecido?.nome ?? ordem.tecido_nome,
        quantidade_total,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar ordem de corte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>Editar ordem de corte</DialogTitle>
        </DialogHeader>
        <form
          id={`edit-ordem-corte-form-${ordem.id}`}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Produto</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tecido</Label>
            <Select value={tecidoId} onValueChange={setTecidoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tecido" />
              </SelectTrigger>
              <SelectContent>
                {tecidos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusOrdemCorte)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as StatusOrdemCorte[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-ordem-observacoes-${ordem.id}`}>Observações</Label>
            <Input
              id={`edit-ordem-observacoes-${ordem.id}`}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Quantidade por tamanho</Label>
            {grade.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este produto ainda não tem grade de tamanhos cadastrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grade.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.tamanho}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={quantidades[t.id] ?? ""}
                          onChange={(e) =>
                            setQuantidades((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="shrink-0">
          <Button type="submit" form={`edit-ordem-corte-form-${ordem.id}`} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {pinDialog}
    </>
  );
}
