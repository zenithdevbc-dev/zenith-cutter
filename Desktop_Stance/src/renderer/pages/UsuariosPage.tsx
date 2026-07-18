import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUsuarioDialog } from "@/components/usuarios/CreateUsuarioDialog";
import { EditUsuarioDialog } from "@/components/usuarios/EditUsuarioDialog";
import { listUsuarios, updateUsuario } from "@/lib/usuarios";
import { useAuth } from "@/lib/auth-context";
import type { PapelUsuario, Usuario } from "@shared/models";

const PAPEL_LABEL: Record<PapelUsuario, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
};

const PAPEL_BADGE_VARIANT: Record<PapelUsuario, "default" | "secondary" | "outline"> = {
  administrador: "default",
  supervisor: "secondary",
  operador: "outline",
};

export function UsuariosPage() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);

  useEffect(() => {
    listUsuarios()
      .then(setUsuarios)
      .catch(() => toast.error("Não foi possível carregar a lista de usuários."));
  }, []);

  function upsertLocal(usuario: Usuario) {
    setUsuarios((prev) => {
      if (!prev) return [usuario];
      const idx = prev.findIndex((u) => u.id === usuario.id);
      if (idx === -1) return [...prev, usuario].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = usuario;
      return next;
    });
  }

  async function handleToggleAtivo(usuario: Usuario, ativo: boolean) {
    try {
      const updated = await updateUsuario(usuario.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Usuário reativado." : "Usuário desativado.");
    } catch {
      toast.error("Não foi possível atualizar o status do usuário.");
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Usuários</CardTitle>
        {isAdmin && <CreateUsuarioDialog onCreated={upsertLocal} />}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {usuarios === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Ativo</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={PAPEL_BADGE_VARIANT[usuario.papel]}>
                      {PAPEL_LABEL[usuario.papel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={usuario.ativo}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) => handleToggleAtivo(usuario, checked)}
                    />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <EditUsuarioDialog usuario={usuario} onUpdated={upsertLocal} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
