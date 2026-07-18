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
import { createProduto } from "@/lib/produtos";
import { useAuth } from "@/lib/auth-context";
import type { Produto } from "@shared/models";

interface CreateProdutoDialogProps {
  onCreated: (produto: Produto) => void;
}

export function CreateProdutoDialog({ onCreated }: CreateProdutoDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setCodigo("");
    setDescricao("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    setSubmitting(true);
    setError(null);
    try {
      const produto = await createProduto({
        empresa_id: usuario.empresa_id,
        nome,
        codigo: codigo || null,
        descricao: descricao || null,
      });
      toast.success(`Produto ${produto.nome} cadastrado.`);
      onCreated(produto);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar produto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Novo produto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="produto-nome">Nome</Label>
            <Input
              id="produto-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="produto-codigo">Código / referência</Label>
            <Input
              id="produto-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="produto-descricao">Descrição</Label>
            <Input
              id="produto-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
