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
import { createMesaCorte } from "@/lib/mesasCorte";
import { useAuth } from "@/lib/auth-context";
import type { MesaCorte } from "@shared/models";

interface CreateMesaDialogProps {
  onCreated: (mesa: MesaCorte) => void;
}

export function CreateMesaDialog({ onCreated }: CreateMesaDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setObservacoes("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    setSubmitting(true);
    setError(null);
    try {
      const mesa = await createMesaCorte({
        empresa_id: usuario.empresa_id,
        nome,
        observacoes: observacoes || null,
      });
      toast.success(`Mesa ${mesa.nome} cadastrada.`);
      onCreated(mesa);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar mesa de corte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Nova mesa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova mesa de corte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mesa-nome">Nome / identificação</Label>
            <Input
              id="mesa-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mesa-observacoes">Observações</Label>
            <Input
              id="mesa-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
