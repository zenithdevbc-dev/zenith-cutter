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
import { CreateMesaDialog } from "@/components/mesas/CreateMesaDialog";
import { EditMesaDialog } from "@/components/mesas/EditMesaDialog";
import { listMesasCorte, updateMesaCorte } from "@/lib/mesasCorte";
import type { MesaCorte } from "@shared/models";

export function MesasCortePage() {
  const [mesas, setMesas] = useState<MesaCorte[] | null>(null);

  useEffect(() => {
    listMesasCorte()
      .then(setMesas)
      .catch(() => toast.error("Não foi possível carregar a lista de mesas de corte."));
  }, []);

  function upsertLocal(mesa: MesaCorte) {
    setMesas((prev) => {
      if (!prev) return [mesa];
      const idx = prev.findIndex((m) => m.id === mesa.id);
      if (idx === -1) return [...prev, mesa].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = mesa;
      return next;
    });
  }

  async function handleToggleAtivo(mesa: MesaCorte, ativo: boolean) {
    try {
      const updated = await updateMesaCorte(mesa.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Mesa reativada." : "Mesa desativada.");
    } catch {
      toast.error("Não foi possível atualizar o status da mesa.");
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Mesas de Corte</CardTitle>
        <CreateMesaDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {mesas === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : mesas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mesa de corte cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mesas.map((mesa) => (
                <TableRow key={mesa.id}>
                  <TableCell className="font-medium">{mesa.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {mesa.observacoes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={mesa.ativo}
                      onCheckedChange={(checked) => handleToggleAtivo(mesa, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditMesaDialog mesa={mesa} onUpdated={upsertLocal} />
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
