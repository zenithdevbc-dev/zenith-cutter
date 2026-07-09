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
import { CreateTecidoDialog } from "@/components/tecidos/CreateTecidoDialog";
import { EditTecidoDialog } from "@/components/tecidos/EditTecidoDialog";
import { listTecidos, updateTecido } from "@/lib/tecidos";
import type { Tecido } from "@shared/models";

export function TecidosPage() {
  const [tecidos, setTecidos] = useState<Tecido[] | null>(null);

  useEffect(() => {
    listTecidos()
      .then(setTecidos)
      .catch(() => toast.error("Não foi possível carregar a lista de tecidos."));
  }, []);

  function upsertLocal(tecido: Tecido) {
    setTecidos((prev) => {
      if (!prev) return [tecido];
      const idx = prev.findIndex((t) => t.id === tecido.id);
      if (idx === -1) return [...prev, tecido].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = tecido;
      return next;
    });
  }

  async function handleToggleAtivo(tecido: Tecido, ativo: boolean) {
    try {
      const updated = await updateTecido(tecido.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Tecido reativado." : "Tecido desativado.");
    } catch {
      toast.error("Não foi possível atualizar o status do tecido.");
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Tecidos</CardTitle>
        <CreateTecidoDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {tecidos === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tecidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum tecido cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Composição</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tecidos.map((tecido) => (
                <TableRow key={tecido.id}>
                  <TableCell className="font-medium">{tecido.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {tecido.composicao ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tecido.cor ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={tecido.ativo}
                      onCheckedChange={(checked) => handleToggleAtivo(tecido, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditTecidoDialog tecido={tecido} onUpdated={upsertLocal} />
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
