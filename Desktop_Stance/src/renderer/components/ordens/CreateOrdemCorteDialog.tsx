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
import { listClientes } from "@/lib/clientes";
import { listProdutos } from "@/lib/produtos";
import { listTecidos } from "@/lib/tecidos";
import { listBancas } from "@/lib/bancas";
import { listProdutoTamanhos } from "@/lib/produtoTamanhos";
import { createOrdemCorte, getNextOrdemCorteNumero } from "@/lib/ordensCorte";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import { GradeQuantidadeInput } from "@/components/ordens/GradeQuantidadeInput";
import type { Banca, Cliente, Produto, Tecido, ProdutoTamanho, OrdemCorteResumo } from "@shared/models";

interface CreateOrdemCorteDialogProps {
  onCreated: (ordem: OrdemCorteResumo) => void;
}

export function CreateOrdemCorteDialog({ onCreated }: CreateOrdemCorteDialogProps) {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [tecidoId, setTecidoId] = useState("");
  const [bancaId, setBancaId] = useState("");
  const [numero, setNumero] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [prazo, setPrazo] = useState("");
  const [grade, setGrade] = useState<ProdutoTamanho[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !usuario) return;
    Promise.all([listClientes(), listProdutos(), listTecidos(), listBancas()])
      .then(([c, p, t, b]) => {
        setClientes(c.filter((x) => x.ativo));
        setProdutos(p.filter((x) => x.ativo));
        setTecidos(t.filter((x) => x.ativo));
        setBancas(b.filter((x) => x.ativo));
      })
      .catch(() => toast.error("Não foi possível carregar clientes/produtos/tecidos/bancas."));
    getNextOrdemCorteNumero(usuario.empresa_id)
      .then((sugestao) => setNumero(String(sugestao)))
      .catch(() => toast.error("Não foi possível sugerir o número da ordem."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!produtoId) {
      setGrade([]);
      return;
    }
    listProdutoTamanhos(produtoId)
      .then((tamanhos) => {
        const ativos = tamanhos.filter((t) => t.ativo);
        setGrade(ativos);
        setQuantidades((prev) => {
          const next: Record<string, string> = {};
          for (const t of ativos) next[t.id] = prev[t.id] ?? "";
          return next;
        });
      })
      .catch(() => toast.error("Não foi possível carregar a grade do produto."));
  }, [produtoId]);

  function reset() {
    setClienteId("");
    setProdutoId("");
    setTecidoId("");
    setBancaId("");
    setNumero("");
    setObservacoes("");
    setPrazo("");
    setGrade([]);
    setQuantidades({});
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario || !clienteId || !produtoId || !tecidoId) return;

    const numeroValido = Number(numero);
    if (!Number.isInteger(numeroValido) || numeroValido <= 0) {
      setError("Informe um número de ordem válido (inteiro maior que zero).");
      return;
    }

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
      const ordem = await createOrdemCorte(
        {
          empresa_id: usuario.empresa_id,
          numero: numeroValido,
          cliente_id: clienteId,
          produto_id: produtoId,
          tecido_id: tecidoId,
          observacoes: observacoes || null,
          prazo: prazo || null,
          banca_id: bancaId || null,
          itens,
        },
        usuario.id,
      );
      const cliente = clientes.find((c) => c.id === clienteId);
      const produto = produtos.find((p) => p.id === produtoId);
      const tecido = tecidos.find((t) => t.id === tecidoId);
      const banca = bancas.find((b) => b.id === bancaId);
      const quantidade_total = itens.reduce((sum, i) => sum + i.quantidade, 0);
      toast.success("Ordem de corte criada.");
      onCreated({
        ...ordem,
        cliente_nome: cliente?.nome ?? "",
        produto_nome: produto?.nome ?? "",
        tecido_nome: tecido?.nome ?? "",
        quantidade_total,
        mesa_atribuida_nome: null,
        banca_nome: banca?.nome ?? null,
      });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar ordem de corte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Nova ordem de corte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>Nova ordem de corte</DialogTitle>
        </DialogHeader>
        <form
          id="create-ordem-corte-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="ordem-numero">Número da ordem</Label>
            <Input
              id="ordem-numero"
              type="number"
              min={1}
              step={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
            />
          </div>
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
            <Label>Banca responsável (opcional)</Label>
            <Select
              value={bancaId || "nenhuma"}
              onValueChange={(v) => setBancaId(v === "nenhuma" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Produção interna</SelectItem>
                {bancas.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ordem-observacoes">Observações</Label>
            <Input
              id="ordem-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ordem-prazo">Prazo (opcional)</Label>
            <Input
              id="ordem-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>

          {produtoId && (
            <GradeQuantidadeInput
              grade={grade}
              quantidades={quantidades}
              onChange={(id, value) =>
                setQuantidades((prev) => ({ ...prev, [id]: value }))
              }
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="shrink-0">
          <Button type="submit" form="create-ordem-corte-form" disabled={submitting}>
            {submitting ? "Salvando..." : "Criar ordem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {pinDialog}
    </>
  );
}
