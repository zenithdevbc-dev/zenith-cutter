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
import { createTecido } from "@/lib/tecidos";
import { useAuth } from "@/lib/auth-context";
import type { Tecido } from "@shared/models";

interface CreateTecidoDialogProps {
  onCreated: (tecido: Tecido) => void;
}

export function CreateTecidoDialog({ onCreated }: CreateTecidoDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [composicao, setComposicao] = useState("");
  const [cor, setCor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setComposicao("");
    setCor("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    setSubmitting(true);
    setError(null);
    try {
      const tecido = await createTecido({
        empresa_id: usuario.empresa_id,
        nome,
        composicao: composicao || null,
        cor: cor || null,
      });
      toast.success(`Material ${tecido.nome} cadastrado.`);
      onCreated(tecido);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar material.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Novo material</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tecido-nome">Nome</Label>
            <Input
              id="tecido-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tecido-composicao">Composição</Label>
            <Input
              id="tecido-composicao"
              value={composicao}
              onChange={(e) => setComposicao(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tecido-cor">Cor</Label>
            <Input
              id="tecido-cor"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
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
