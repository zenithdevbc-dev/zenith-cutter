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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUsuario } from "@/lib/usuarios";
import type { Usuario } from "@shared/models";

interface EditUsuarioDialogProps {
  usuario: Usuario;
  onUpdated: (usuario: Usuario) => void;
}

export function EditUsuarioDialog({ usuario, onUpdated }: EditUsuarioDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(usuario.nome);
  const [login, setLogin] = useState(usuario.login);
  const [papel, setPapel] = useState(usuario.papel);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateUsuario(usuario.id, { nome, login, papel });
      toast.success("Usuário atualizado.");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar usuário.");
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
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-nome">Nome</Label>
            <Input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-login">Login</Label>
            <Input id="edit-login" value={login} onChange={(e) => setLogin(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Papel</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as Usuario["papel"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
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
