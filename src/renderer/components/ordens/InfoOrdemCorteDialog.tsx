import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { listOrdemCorteItens, listOrdemCorteHistorico } from "@/lib/ordensCorte";
import { listProducaoPerdasPorOrdem } from "@/lib/producao";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import { formatDataISO } from "@/lib/date";
import type {
  OrdemCorteHistoricoEntry,
  OrdemCorteItem,
  OrdemCorteResumo,
  ProducaoPerda,
} from "@shared/models";

interface InfoOrdemCorteDialogProps {
  ordem: OrdemCorteResumo;
}

export function InfoOrdemCorteDialog({ ordem }: InfoOrdemCorteDialogProps) {
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<OrdemCorteItem[] | null>(null);
  const [historico, setHistorico] = useState<OrdemCorteHistoricoEntry[] | null>(null);
  const [perdas, setPerdas] = useState<ProducaoPerda[] | null>(null);

  useEffect(() => {
    if (!open) return;
    listOrdemCorteItens(ordem.id)
      .then(setItens)
      .catch(() => toast.error("Não foi possível carregar os itens da ordem."));
    listOrdemCorteHistorico(ordem.id)
      .then(setHistorico)
      .catch(() => toast.error("Não foi possível carregar o histórico da ordem."));
    listProducaoPerdasPorOrdem(ordem.id)
      .then(setPerdas)
      .catch(() => toast.error("Não foi possível carregar as perdas da ordem."));
  }, [open, ordem.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Info</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>Ordem de corte Nº {ordem.numero} — {ordem.produto_nome}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Número</p>
              <p className="font-medium">{ordem.numero}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{ordem.cliente_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Produto</p>
              <p className="font-medium">{ordem.produto_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tecido</p>
              <p className="font-medium">{ordem.tecido_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={STATUS_ORDEM_CORTE_VARIANT[ordem.status]}>
                {STATUS_ORDEM_CORTE_LABEL[ordem.status]}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Prazo</p>
              <p className="font-medium">
                {ordem.prazo ? formatDataISO(ordem.prazo) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">{new Date(ordem.criado_em).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Atualizado em</p>
              <p className="font-medium">
                {new Date(ordem.atualizado_em).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground">Observações</p>
            <p className="font-medium">{ordem.observacoes || "—"}</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Quantidade por tamanho</p>
            {itens === null ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens cadastrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.tamanho}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Perdas</p>
            {perdas === null ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : perdas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma perda registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perdas.map((perda) => (
                    <TableRow key={perda.id}>
                      <TableCell>{perda.tamanho ?? "—"}</TableCell>
                      <TableCell>{perda.quantidade}</TableCell>
                      <TableCell>{perda.motivo || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Histórico</p>
            {historico === null ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {historico.map((evento) => (
                  <li key={evento.id} className="border-l-2 pl-3">
                    <p className="font-medium">{evento.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {evento.usuario_nome} —{" "}
                      {new Date(evento.criado_em).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
