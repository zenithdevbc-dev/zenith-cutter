import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listFilaProducao, reorderFilaProducao } from "@/lib/filaProducao";
import { listMesasComStatus } from "@/lib/producao";
import type { MesaCorteComStatus, OrdemCorteResumo } from "@shared/models";

/**
 * Fila de Produção (admin/supervisor): reordenação manual de
 * prioridade + visualização de mesas. A ação de "Iniciar" em si
 * (seleção de mesa + confirmação) mora na página Produção, acessível
 * também ao Operador (ver CLAUDE.md 3.6).
 */
export function FilaProducaoPage() {
  const [fila, setFila] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);

  useEffect(() => {
    listFilaProducao()
      .then(setFila)
      .catch(() => toast.error("Não foi possível carregar a fila de produção."));
    listMesasComStatus()
      .then(setMesas)
      .catch(() => toast.error("Não foi possível carregar as mesas de corte."));
  }, []);

  async function handleMove(index: number, direction: -1 | 1) {
    if (!fila) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fila.length) return;

    const reordered = [...fila];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setFila(reordered);

    try {
      const updated = await reorderFilaProducao(reordered.map((o) => o.id));
      setFila(updated);
    } catch {
      toast.error("Não foi possível reordenar a fila.");
    }
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex h-full min-h-0 flex-col lg:col-span-2">
        <CardHeader>
          <CardTitle>Fila de Produção</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          {fila === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : fila.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem na fila de produção.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tecido</TableHead>
                  <TableHead>Qtd. total</TableHead>
                  <TableHead className="text-right">Mover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fila.map((ordem, index) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{ordem.numero}</TableCell>
                    <TableCell>{ordem.cliente_nome}</TableCell>
                    <TableCell>{ordem.produto_nome}</TableCell>
                    <TableCell>{ordem.tecido_nome}</TableCell>
                    <TableCell>{ordem.quantidade_total}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMove(index, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={index === fila.length - 1}
                          onClick={() => handleMove(index, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader>
          <CardTitle>Mesas de Corte</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          {mesas === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : mesas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mesa de corte cadastrada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{mesa.nome}</p>
                    {mesa.ocupada && mesa.ordem_numero !== null && (
                      <p className="text-xs text-muted-foreground">Ordem Nº {mesa.ordem_numero}</p>
                    )}
                  </div>
                  <Badge variant={mesa.ocupada ? "destructive" : "secondary"}>
                    {mesa.ocupada ? "Ocupada" : "Livre"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
