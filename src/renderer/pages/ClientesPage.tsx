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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClienteDialog } from "@/components/clientes/CreateClienteDialog";
import { EditClienteDialog } from "@/components/clientes/EditClienteDialog";
import { listClientes, updateCliente } from "@/lib/clientes";
import type { Cliente } from "@shared/models";

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);

  useEffect(() => {
    listClientes()
      .then(setClientes)
      .catch(() => toast.error("Não foi possível carregar a lista de clientes."));
  }, []);

  function upsertLocal(cliente: Cliente) {
    setClientes((prev) => {
      if (!prev) return [cliente];
      const idx = prev.findIndex((c) => c.id === cliente.id);
      if (idx === -1) return [...prev, cliente].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = cliente;
      return next;
    });
  }

  async function handleToggleAtivo(cliente: Cliente, ativo: boolean) {
    try {
      const updated = await updateCliente(cliente.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Cliente reativado." : "Cliente desativado.");
    } catch {
      toast.error("Não foi possível atualizar o status do cliente.");
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Clientes</CardTitle>
        <CreateClienteDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {clientes === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.documento ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.telefone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={cliente.ativo}
                      onCheckedChange={(checked) => handleToggleAtivo(cliente, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditClienteDialog cliente={cliente} onUpdated={upsertLocal} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
