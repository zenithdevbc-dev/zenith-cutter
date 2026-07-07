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
import { updateCliente } from "@/lib/clientes";
import type { Cliente } from "@shared/models";

interface EditClienteDialogProps {
  cliente: Cliente;
  onUpdated: (cliente: Cliente) => void;
}

export function EditClienteDialog({ cliente, onUpdated }: EditClienteDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(cliente.nome);
  const [documento, setDocumento] = useState(cliente.documento ?? "");
  const [telefone, setTelefone] = useState(cliente.telefone ?? "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateCliente(cliente.id, {
        nome,
        documento: documento || null,
        telefone: telefone || null,
        email: email || null,
      });
      toast.success("Cliente atualizado.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar cliente.");
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
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-cliente-nome">Nome / Razão social</Label>
            <Input
              id="edit-cliente-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-cliente-documento">CPF/CNPJ</Label>
            <Input
              id="edit-cliente-documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-cliente-telefone">Telefone</Label>
            <Input
              id="edit-cliente-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-cliente-email">E-mail</Label>
            <Input
              id="edit-cliente-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
