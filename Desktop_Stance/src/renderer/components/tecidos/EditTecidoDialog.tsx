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
import { updateTecido } from "@/lib/tecidos";
import type { Tecido } from "@shared/models";

interface EditTecidoDialogProps {
  tecido: Tecido;
  onUpdated: (tecido: Tecido) => void;
}

export function EditTecidoDialog({ tecido, onUpdated }: EditTecidoDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(tecido.nome);
  const [composicao, setComposicao] = useState(tecido.composicao ?? "");
  const [cor, setCor] = useState(tecido.cor ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateTecido(tecido.id, {
        nome,
        composicao: composicao || null,
        cor: cor || null,
      });
      toast.success("Material atualizado.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar material.");
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
          <DialogTitle>Editar material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-tecido-nome">Nome</Label>
            <Input
              id="edit-tecido-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-tecido-composicao">Composição</Label>
            <Input
              id="edit-tecido-composicao"
              value={composicao}
              onChange={(e) => setComposicao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-tecido-cor">Cor</Label>
            <Input
              id="edit-tecido-cor"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
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
