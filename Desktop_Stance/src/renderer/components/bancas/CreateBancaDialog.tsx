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
import { createBanca } from "@/lib/bancas";
import { useAuth } from "@/lib/auth-context";
import type { Banca } from "@shared/models";

interface CreateBancaDialogProps {
  onCreated: (banca: Banca) => void;
}

export function CreateBancaDialog({ onCreated }: CreateBancaDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setResponsavel("");
    setTelefone("");
    setWhatsapp("");
    setEmail("");
    setEndereco("");
    setTipoServico("");
    setObservacoes("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    setSubmitting(true);
    setError(null);
    try {
      const banca = await createBanca({
        empresa_id: usuario.empresa_id,
        nome,
        responsavel: responsavel || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        endereco: endereco || null,
        tipo_servico: tipoServico || null,
        observacoes: observacoes || null,
      });
      toast.success(`Terceiro ${banca.nome} cadastrado.`);
      onCreated(banca);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar terceiro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button>Novo terceiro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>Novo terceiro</DialogTitle>
        </DialogHeader>
        <form
          id="create-banca-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-nome">Nome do terceiro</Label>
            <Input
              id="banca-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-responsavel">Responsável</Label>
            <Input
              id="banca-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-telefone">Telefone</Label>
            <Input
              id="banca-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-whatsapp">WhatsApp</Label>
            <Input
              id="banca-whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-email">E-mail</Label>
            <Input
              id="banca-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-endereco">Endereço</Label>
            <Input
              id="banca-endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-tipo-servico">Tipo de serviço</Label>
            <Input
              id="banca-tipo-servico"
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="banca-observacoes">Observações</Label>
            <Input
              id="banca-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="shrink-0">
          <Button type="submit" form="create-banca-form" disabled={submitting}>
            {submitting ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
