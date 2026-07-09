import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listProdutoTamanhos,
  createProdutoTamanho,
  updateProdutoTamanho,
  reorderProdutoTamanhos,
} from "@/lib/produtoTamanhos";
import { useAuth } from "@/lib/auth-context";
import type { Produto, ProdutoTamanho } from "@shared/models";

interface ProdutoGradeDialogProps {
  produto: Produto;
}

export function ProdutoGradeDialog({ produto }: ProdutoGradeDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [tamanhos, setTamanhos] = useState<ProdutoTamanho[] | null>(null);
  const [novoTamanho, setNovoTamanho] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listProdutoTamanhos(produto.id)
      .then(setTamanhos)
      .catch(() => toast.error("Não foi possível carregar a grade do produto."));
  }, [open, produto.id]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!usuario || !novoTamanho.trim()) return;
    setSubmitting(true);
    try {
      const tamanho = await createProdutoTamanho({
        empresa_id: usuario.empresa_id,
        produto_id: produto.id,
        tamanho: novoTamanho.trim(),
      });
      setTamanhos((prev) => [...(prev ?? []), tamanho]);
      setNovoTamanho("");
    } catch {
      toast.error("Não foi possível adicionar o tamanho.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRenomear(tamanho: ProdutoTamanho, novoNome: string) {
    if (novoNome === tamanho.tamanho) return;
    try {
      const updated = await updateProdutoTamanho(tamanho.id, { tamanho: novoNome });
      setTamanhos((prev) =>
        (prev ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch {
      toast.error("Não foi possível renomear o tamanho.");
    }
  }

  async function handleToggleAtivo(tamanho: ProdutoTamanho, ativo: boolean) {
    try {
      const updated = await updateProdutoTamanho(tamanho.id, { ativo });
      setTamanhos((prev) =>
        (prev ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch {
      toast.error("Não foi possível atualizar o status do tamanho.");
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!tamanhos) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tamanhos.length) return;

    const reordered = [...tamanhos];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setTamanhos(reordered);

    try {
      const updated = await reorderProdutoTamanhos(reordered.map((t) => t.id));
      setTamanhos(updated);
    } catch {
      toast.error("Não foi possível reordenar a grade.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Grade</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Grade de tamanhos — {produto.nome}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex shrink-0 gap-2">
          <Input
            placeholder="Novo tamanho (ex.: P, 38, Único)"
            value={novoTamanho}
            onChange={(e) => setNovoTamanho(e.target.value)}
          />
          <Button type="submit" disabled={submitting || !novoTamanho.trim()}>
            Adicionar
          </Button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tamanhos === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : tamanhos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tamanho cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Mover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tamanhos.map((tamanho, index) => (
                  <TableRow key={tamanho.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        defaultValue={tamanho.tamanho}
                        onBlur={(e) => handleRenomear(tamanho, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tamanho.ativo}
                        onCheckedChange={(checked) => handleToggleAtivo(tamanho, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMove(index, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={index === tamanhos.length - 1}
                          onClick={() => handleMove(index, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
