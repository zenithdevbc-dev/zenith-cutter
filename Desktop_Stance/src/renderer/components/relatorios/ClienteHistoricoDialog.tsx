import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import { calcularTempoProducaoMinutos, formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import type { RelatorioProducaoLinha } from "@shared/models";

interface ClienteHistoricoDialogProps {
  clienteId: string;
  clienteNome: string;
  todasLinhas: RelatorioProducaoLinha[];
}

/**
 * Histórico completo de um cliente (todas as ordens já registradas
 * para ele, sem aplicar os filtros de período/material do relatório —
 * "histórico completo" é literal). Acionado por linha na aba
 * Clientes.
 */
export function ClienteHistoricoDialog({
  clienteId,
  clienteNome,
  todasLinhas,
}: ClienteHistoricoDialogProps) {
  const [open, setOpen] = useState(false);

  const ordensDoCliente = useMemo(
    () =>
      todasLinhas
        .filter((linha) => linha.cliente_id === clienteId)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    [todasLinhas, clienteId],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Ver histórico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>Histórico — {clienteNome}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {ordensDoCliente.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Conclusão</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordensDoCliente.map((linha) => (
                    <TableRow key={linha.ordem_id}>
                      <TableCell className="font-medium">{linha.numero}</TableCell>
                      <TableCell>{linha.tecido_nome}</TableCell>
                      <TableCell>
                        {new Date(linha.criado_em).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {linha.iniciado_em
                          ? new Date(linha.iniciado_em).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {linha.finalizado_em
                          ? new Date(linha.finalizado_em).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {formatarDuracaoMinutos(calcularTempoProducaoMinutos(linha))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_ORDEM_CORTE_VARIANT[linha.status]}>
                          {STATUS_ORDEM_CORTE_LABEL[linha.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
