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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listFilaProducao } from "@/lib/filaProducao";
import { listMesasComStatus, listSessoesAtivas, avancarEtapaOrdem } from "@/lib/producao";
import { listOrdensCorte } from "@/lib/ordensCorte";
import { IniciarProducaoDialog } from "@/components/producao/IniciarProducaoDialog";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import {
  PIPELINE_PRODUCAO,
  type MesaCorteComStatus,
  type OrdemCorteResumo,
  type SessaoProducao,
  type SessaoProducaoResumo,
  type StatusOrdemCorte,
} from "@shared/models";

const ETAPA_LABEL: Record<StatusOrdemCorte, string> = {
  aberta: "Aberta",
  em_fila: "Em Fila",
  cancelada: "Cancelada",
  em_corte: "Em Corte",
  embalagem: "Embalagem",
  revisao: "Revisão",
  despacho: "Despacho",
  pronto: "Pronto",
};

/**
 * Execução da produção (todos os papéis, ver CLAUDE.md 3.6): a fila
 * (mesma ordem definida em Fila de Produção, aqui só leitura) com o
 * botão "Iniciar", as mesas com status livre/ocupada, as sessões em
 * andamento e o pipeline pós-corte (Embalagem/Revisão/Despacho/
 * Pronto), avançado uma etapa por vez (decisão de 2026-07-11).
 */
export function ProducaoPage() {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [fila, setFila] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [sessoes, setSessoes] = useState<SessaoProducaoResumo[] | null>(null);
  const [emProducao, setEmProducao] = useState<OrdemCorteResumo[] | null>(null);

  function reload() {
    listFilaProducao()
      .then(setFila)
      .catch(() => toast.error("Não foi possível carregar a fila de produção."));
    listMesasComStatus()
      .then(setMesas)
      .catch(() => toast.error("Não foi possível carregar as mesas de corte."));
    listSessoesAtivas()
      .then(setSessoes)
      .catch(() => toast.error("Não foi possível carregar as sessões em andamento."));
    listOrdensCorte()
      .then((ordens) =>
        setEmProducao(ordens.filter((o) => PIPELINE_PRODUCAO.includes(o.status))),
      )
      .catch(() => toast.error("Não foi possível carregar o pipeline de produção."));
  }

  useEffect(reload, []);

  function handleIniciado(ordemId: string, _sessao: SessaoProducao) {
    setFila((prev) => (prev ?? []).filter((o) => o.id !== ordemId));
    reload();
  }

  async function handleAvancar(ordem: OrdemCorteResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await avancarEtapaOrdem(ordem.id, usuario.id);
      toast.success(`Ordem Nº ${ordem.numero} avançou de etapa.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível avançar a etapa.");
    }
  }

  const mesasLivres = (mesas ?? []).filter((m) => m.ativo && !m.ocupada);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
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
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tecido</TableHead>
                    <TableHead>Qtd. total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fila.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell className="font-medium">{ordem.numero}</TableCell>
                      <TableCell>{ordem.cliente_nome}</TableCell>
                      <TableCell>{ordem.produto_nome}</TableCell>
                      <TableCell>{ordem.tecido_nome}</TableCell>
                      <TableCell>{ordem.quantidade_total}</TableCell>
                      <TableCell className="text-right">
                        <IniciarProducaoDialog
                          ordem={ordem}
                          mesasLivres={mesasLivres}
                          onIniciado={(sessao) => handleIniciado(ordem.id, sessao)}
                        />
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
                        <p className="text-xs text-muted-foreground">
                          Ordem Nº {mesa.ordem_numero}
                        </p>
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

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Pipeline de Produção</CardTitle>
        </CardHeader>
        <CardContent>
          {emProducao === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : emProducao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem em produção no momento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Etapa atual</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emProducao.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">{ordem.numero}</TableCell>
                    <TableCell>{ordem.cliente_nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ETAPA_LABEL[ordem.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ordem.status !== "pronto" && (
                        <Button size="sm" variant="outline" onClick={() => handleAvancar(ordem)}>
                          Avançar etapa
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Em andamento (mesas)</CardTitle>
        </CardHeader>
        <CardContent>
          {sessoes === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : sessoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sessão de produção ativa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem Nº</TableHead>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Iniciado por</TableHead>
                  <TableHead>Iniciado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((sessao) => (
                  <TableRow key={sessao.id}>
                    <TableCell className="font-medium">{sessao.ordem_numero}</TableCell>
                    <TableCell>{sessao.mesa_nome}</TableCell>
                    <TableCell>{sessao.iniciado_por_nome}</TableCell>
                    <TableCell>{new Date(sessao.iniciado_em).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {pinDialog}
    </div>
  );
}
