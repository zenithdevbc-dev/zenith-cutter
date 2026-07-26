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
import { updateBanca } from "@/lib/bancas";
import type { Banca } from "@shared/models";

interface EditBancaDialogProps {
  banca: Banca;
  onUpdated: (banca: Banca) => void;
}

export function EditBancaDialog({ banca, onUpdated }: EditBancaDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(banca.nome);
  const [responsavel, setResponsavel] = useState(banca.responsavel ?? "");
  const [telefone, setTelefone] = useState(banca.telefone ?? "");
  const [whatsapp, setWhatsapp] = useState(banca.whatsapp ?? "");
  const [email, setEmail] = useState(banca.email ?? "");
  const [endereco, setEndereco] = useState(banca.endereco ?? "");
  const [tipoServico, setTipoServico] = useState(banca.tipo_servico ?? "");
  const [observacoes, setObservacoes] = useState(banca.observacoes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateBanca(banca.id, {
        nome,
        responsavel: responsavel || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        endereco: endereco || null,
        tipo_servico: tipoServico || null,
        observacoes: observacoes || null,
      });
      toast.success("Terceiro atualizado.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar terceiro.");
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
        <DialogHeader className="shrink-0">
          <DialogTitle>Editar terceiro</DialogTitle>
        </DialogHeader>
        <form
          id={`edit-banca-form-${banca.id}`}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-nome-${banca.id}`}>Nome do terceiro</Label>
            <Input
              id={`edit-banca-nome-${banca.id}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-responsavel-${banca.id}`}>Responsável</Label>
            <Input
              id={`edit-banca-responsavel-${banca.id}`}
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-telefone-${banca.id}`}>Telefone</Label>
            <Input
              id={`edit-banca-telefone-${banca.id}`}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-whatsapp-${banca.id}`}>WhatsApp</Label>
            <Input
              id={`edit-banca-whatsapp-${banca.id}`}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-email-${banca.id}`}>E-mail</Label>
            <Input
              id={`edit-banca-email-${banca.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-endereco-${banca.id}`}>Endereço</Label>
            <Input
              id={`edit-banca-endereco-${banca.id}`}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-tipo-servico-${banca.id}`}>Tipo de serviço</Label>
            <Input
              id={`edit-banca-tipo-servico-${banca.id}`}
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit-banca-observacoes-${banca.id}`}>Observações</Label>
            <Input
              id={`edit-banca-observacoes-${banca.id}`}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="shrink-0">
          <Button type="submit" form={`edit-banca-form-${banca.id}`} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
