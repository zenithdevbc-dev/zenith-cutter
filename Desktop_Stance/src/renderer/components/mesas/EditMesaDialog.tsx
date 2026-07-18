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
import { updateMesaCorte } from "@/lib/mesasCorte";
import type { MesaCorte } from "@shared/models";

interface EditMesaDialogProps {
  mesa: MesaCorte;
  onUpdated: (mesa: MesaCorte) => void;
}

export function EditMesaDialog({ mesa, onUpdated }: EditMesaDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(mesa.nome);
  const [observacoes, setObservacoes] = useState(mesa.observacoes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateMesaCorte(mesa.id, {
        nome,
        observacoes: observacoes || null,
      });
      toast.success("Mesa de corte atualizada.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar mesa de corte.");
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
          <DialogTitle>Editar mesa de corte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-mesa-nome">Nome / identificação</Label>
            <Input
              id="edit-mesa-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-mesa-observacoes">Observações</Label>
            <Input
              id="edit-mesa-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
