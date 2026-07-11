import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { iniciarProducao } from "@/lib/producao";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import type { MesaCorteComStatus, OrdemCorteResumo, SessaoProducao } from "@shared/models";

interface IniciarProducaoDialogProps {
  ordem: OrdemCorteResumo;
  mesasLivres: MesaCorteComStatus[];
  onIniciado: (sessao: SessaoProducao) => void;
}

/**
 * Seleção manual de mesa livre + confirmação explícita antes de
 * iniciar a produção (regra 3.1 — nenhuma etapa é iniciada
 * automaticamente). Reusa o mesmo hook de PIN das Ordens de Corte.
 */
export function IniciarProducaoDialog({
  ordem,
  mesasLivres,
  onIniciado,
}: IniciarProducaoDialogProps) {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [open, setOpen] = useState(false);
  const [mesaId, setMesaId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmar() {
    if (!usuario || !mesaId) return;
    if (!(await confirmPin())) return;
    setSubmitting(true);
    try {
      const sessao = await iniciarProducao({ ordem_id: ordem.id, mesa_id: mesaId }, usuario.id);
      onIniciado(sessao);
      toast.success(`Produção iniciada para a ordem Nº ${ordem.numero}.`);
      setOpen(false);
      setMesaId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a produção.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Iniciar</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar produção — Ordem Nº {ordem.numero}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {ordem.cliente_nome} · {ordem.produto_nome} · {ordem.tecido_nome}
            </p>
            {mesasLivres.length === 0 ? (
              <p className="text-sm text-destructive">Nenhuma mesa de corte livre no momento.</p>
            ) : (
              <Select value={mesaId} onValueChange={setMesaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma mesa livre" />
                </SelectTrigger>
                <SelectContent>
                  {mesasLivres.map((mesa) => (
                    <SelectItem key={mesa.id} value={mesa.id}>
                      {mesa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!mesaId || submitting} onClick={handleConfirmar}>
              {submitting ? "Iniciando..." : "Confirmar início"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {pinDialog}
    </>
  );
}
