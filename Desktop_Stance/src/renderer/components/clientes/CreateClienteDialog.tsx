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
import { createCliente } from "@/lib/clientes";
import { useAuth } from "@/lib/auth-context";
import type { Cliente } from "@shared/models";

interface CreateClienteDialogProps {
  onCreated: (cliente: Cliente) => void;
}

export function CreateClienteDialog({ onCreated }: CreateClienteDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setDocumento("");
    setTelefone("");
    setEmail("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    setSubmitting(true);
    setError(null);
    try {
      const cliente = await createCliente({
        empresa_id: usuario.empresa_id,
        nome,
        documento: documento || null,
        telefone: telefone || null,
        email: email || null,
      });
      toast.success(`Cliente ${cliente.nome} cadastrado.`);
      onCreated(cliente);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Novo cliente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente-nome">Nome / Razão social</Label>
            <Input
              id="cliente-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente-documento">CPF/CNPJ</Label>
            <Input
              id="cliente-documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente-telefone">Telefone</Label>
            <Input
              id="cliente-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente-email">E-mail</Label>
            <Input
              id="cliente-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
