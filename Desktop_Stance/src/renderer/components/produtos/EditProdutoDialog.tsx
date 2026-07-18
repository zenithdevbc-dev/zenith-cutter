import { useState, type FormEvent } from "react";
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
import { updateProduto } from "@/lib/produtos";
import type { Produto } from "@shared/models";

interface EditProdutoDialogProps {
  produto: Produto;
  onUpdated: (produto: Produto) => void;
}

export function EditProdutoDialog({ produto, onUpdated }: EditProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(produto.nome);
  const [codigo, setCodigo] = useState(produto.codigo ?? "");
  const [descricao, setDescricao] = useState(produto.descricao ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduto(produto.id, {
        nome,
        codigo: codigo || null,
        descricao: descricao || null,
      });
      toast.success("Produto atualizado.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar produto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-produto-nome">Nome</Label>
            <Input
              id="edit-produto-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-produto-codigo">Código / referência</Label>
            <Input
              id="edit-produto-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-produto-descricao">Descrição</Label>
            <Input
              id="edit-produto-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
