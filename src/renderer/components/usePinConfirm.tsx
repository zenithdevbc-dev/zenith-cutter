import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { verifyPin } from "@/lib/pin";

/**
 * Confirmação de PIN antes de criar/editar/cancelar/duplicar uma Ordem
 * de Corte (pedido do usuário — reforça o "operador sempre no
 * controle" da seção 3.1). `confirm()` devolve uma Promise<boolean>:
 * true se o PIN bateu, false se o usuário cancelou. Usar assim:
 *
 *   const { confirm, dialog } = usePinConfirm();
 *   if (!(await confirm())) return;
 *   ...
 *   return <>{form}{dialog}</>;
 */
export function usePinConfirm() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  function confirm(): Promise<boolean> {
    setPin("");
    setError(null);
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function resolveAndClose(confirmed: boolean) {
    setOpen(false);
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const ok = await verifyPin(pin);
    setSubmitting(false);
    if (ok) {
      resolveAndClose(true);
    } else {
      setError("PIN incorreto.");
    }
  }

  const dialog = (
    <Dialog open={open} onOpenChange={(next) => { if (!next) resolveAndClose(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirme seu PIN</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin-confirm">PIN (sua senha de login)</Label>
            <Input
              id="pin-confirm"
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => resolveAndClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verificando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
