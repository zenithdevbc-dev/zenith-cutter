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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listFilaProducao, reorderFilaProducao } from "@/lib/filaProducao";
import {
  listMesasComStatus,
  listSessoesAtivas,
  iniciarProducao,
  avancarEtapaOrdem,
  pausarProducao,
  retomarProducao,
} from "@/lib/producao";
import { listOrdensCorte, atribuirMesaOrdem } from "@/lib/ordensCorte";
import { IniciarProducaoDialog } from "@/components/producao/IniciarProducaoDialog";
import { PerdasObservacoesDialog } from "@/components/producao/PerdasObservacoesDialog";
import { useAuth } from "@/lib/auth-context";
import { usePinConfirm } from "@/components/usePinConfirm";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import {
  PIPELINE_PRODUCAO,
  type MesaCorteComStatus,
  type OrdemCorteResumo,
  type SessaoProducao,
  type SessaoProducaoResumo,
} from "@shared/models";

/**
 * Tempo de produção efetivo: tempo decorrido desde o início, menos o
 * tempo acumulado em pausas (e, se pausada agora, menos a pausa em
 * andamento também). Cálculo estático no momento do reload — não é um
 * cronômetro ao vivo (simplicidade).
 */
function formatTempoProducao(sessao: SessaoProducaoResumo): string {
  const inicio = new Date(sessao.iniciado_em).getTime();
  const agora = Date.now();
  let pausadoMs = sessao.tempo_pausado_segundos * 1000;
  if (sessao.status === "pausada" && sessao.pausado_em) {
    pausadoMs += agora - new Date(sessao.pausado_em).getTime();
  }
  const efetivoMs = Math.max(0, agora - inicio - pausadoMs);
  const totalMin = Math.floor(efetivoMs / 60000);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return horas > 0 ? `${horas}h${String(minutos).padStart(2, "0")}min` : `${minutos}min`;
}

/**
 * Execução da produção (todos os papéis, ver CLAUDE.md 3.6): a fila
 * com o botão "Iniciar", as mesas com status livre/ocupada, as
 * sessões em andamento e o pipeline pós-corte (Embalagem/Revisão/
 * Despacho/Pronto), avançado uma etapa por vez (decisão de
 * 2026-07-11). A reordenação manual de prioridade da fila (antes numa
 * página "Fila de Produção" separada, removida em 2026-07-14 por ser
 * redundante) fica só visível/ativa pra admin/supervisor — Operador
 * vê a mesma fila sem os botões de mover.
 */
export function ProducaoPage() {
  const { usuario } = useAuth();
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const podeReordenar =
    usuario?.papel === "administrador" || usuario?.papel === "supervisor";
  const [fila, setFila] = useState<OrdemCorteResumo[] | null>(null);
  const [mesas, setMesas] = useState<MesaCorteComStatus[] | null>(null);
  const [sessoes, setSessoes] = useState<SessaoProducaoResumo[] | null>(null);
  const [emProducao, setEmProducao] = useState<OrdemCorteResumo[] | null>(null);
  const [mesaAberta, setMesaAberta] = useState<MesaCorteComStatus | null>(null);

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

  async function handleAtribuirMesa(ordem: OrdemCorteResumo, mesaAtribuidaId: string | null) {
    if (!usuario) return;
    try {
      const updated = await atribuirMesaOrdem(ordem.id, mesaAtribuidaId, usuario.id);
      setFila((prev) => (prev ?? []).map((o) => (o.id === ordem.id ? updated : o)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atribuir a mesa.");
    }
  }

  async function handleIniciarNaMesa(ordem: OrdemCorteResumo, mesa: MesaCorteComStatus) {
    if (!usuario || mesa.ocupada) return;
    if (!(await confirmPin())) return;
    try {
      const sessao = await iniciarProducao({ ordem_id: ordem.id, mesa_id: mesa.id }, usuario.id);
      handleIniciado(ordem.id, sessao);
      setMesaAberta(null);
      toast.success(`Produção iniciada para a ordem Nº ${ordem.numero}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a produção.");
    }
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

  async function handlePausar(sessao: SessaoProducaoResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await pausarProducao(sessao.ordem_id, usuario.id);
      toast.success(`Produção da ordem Nº ${sessao.ordem_numero} pausada.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível pausar a produção.");
    }
  }

  async function handleRetomar(sessao: SessaoProducaoResumo) {
    if (!usuario) return;
    if (!(await confirmPin())) return;
    try {
      await retomarProducao(sessao.ordem_id, usuario.id);
      toast.success(`Produção da ordem Nº ${sessao.ordem_numero} retomada.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível retomar a produção.");
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
                    <TableHead>Mesa atribuída</TableHead>
                    {podeReordenar && <TableHead>Mover</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fila.map((ordem, index) => (
                    <TableRow key={ordem.id}>
                      <TableCell className="font-medium">{ordem.numero}</TableCell>
                      <TableCell>{ordem.cliente_nome}</TableCell>
                      <TableCell>{ordem.produto_nome}</TableCell>
                      <TableCell>{ordem.tecido_nome}</TableCell>
                      <TableCell>{ordem.quantidade_total}</TableCell>
                      <TableCell>
                        {podeReordenar ? (
                          <Select
                            value={ordem.mesa_atribuida_id ?? "nenhuma"}
                            onValueChange={(v) =>
                              handleAtribuirMesa(ordem, v === "nenhuma" ? null : v)
                            }
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhuma">Nenhuma</SelectItem>
                              {(mesas ?? [])
                                .filter((m) => m.ativo)
                                .map((mesa) => (
                                  <SelectItem key={mesa.id} value={mesa.id}>
                                    {mesa.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          ordem.mesa_atribuida_nome ?? "—"
                        )}
                      </TableCell>
                      {podeReordenar && (
                        <TableCell>
                          <div className="flex gap-1">
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
                      )}
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
                {mesas.map((mesa) => {
                  const filaDaMesa = (fila ?? []).filter((o) => o.mesa_atribuida_id === mesa.id);
                  return (
                    <button
                      key={mesa.id}
                      type="button"
                      onClick={() => setMesaAberta(mesa)}
                      className="flex items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{mesa.nome}</p>
                        {mesa.ocupada && mesa.ordem_numero !== null && (
                          <p className="text-xs text-muted-foreground">
                            Ordem Nº {mesa.ordem_numero}
                          </p>
                        )}
                        {filaDaMesa.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {filaDaMesa.length} na fila
                          </p>
                        )}
                      </div>
                      <Badge variant={mesa.ocupada ? "destructive" : "secondary"}>
                        {mesa.ocupada ? "Ocupada" : "Livre"}
                      </Badge>
                    </button>
                  );
                })}
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
                      <Badge variant={STATUS_ORDEM_CORTE_VARIANT[ordem.status]}>
                        {STATUS_ORDEM_CORTE_LABEL[ordem.status]}
                      </Badge>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Iniciado por</TableHead>
                  <TableHead>Iniciado em</TableHead>
                  <TableHead>Tempo em produção</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessoes.map((sessao) => (
                  <TableRow key={sessao.id}>
                    <TableCell className="font-medium">{sessao.ordem_numero}</TableCell>
                    <TableCell>{sessao.mesa_nome}</TableCell>
                    <TableCell>
                      <Badge variant={sessao.status === "pausada" ? "paused" : "production"}>
                        {sessao.status === "pausada" ? "Pausada" : "Em Andamento"}
                      </Badge>
                    </TableCell>
                    <TableCell>{sessao.iniciado_por_nome}</TableCell>
                    <TableCell>{new Date(sessao.iniciado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{formatTempoProducao(sessao)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <PerdasObservacoesDialog sessao={sessao} />
                        {sessao.status === "em_andamento" ? (
                          <Button size="sm" variant="outline" onClick={() => handlePausar(sessao)}>
                            Pausar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleRetomar(sessao)}>
                            Retomar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={mesaAberta !== null} onOpenChange={(v) => !v && setMesaAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mesa {mesaAberta?.nome}</DialogTitle>
          </DialogHeader>
          {mesaAberta && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge variant={mesaAberta.ocupada ? "destructive" : "secondary"}>
                  {mesaAberta.ocupada ? "Ocupada" : "Livre"}
                </Badge>
                {mesaAberta.ocupada && mesaAberta.ordem_numero !== null && (
                  <span className="text-sm text-muted-foreground">
                    Ordem Nº {mesaAberta.ordem_numero}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Fila desta mesa</p>
                {(() => {
                  const filaDaMesa = (fila ?? []).filter(
                    (o) => o.mesa_atribuida_id === mesaAberta.id,
                  );
                  return filaDaMesa.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma ordem atribuída a esta mesa.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filaDaMesa.map((ordem) => (
                        <div
                          key={ordem.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              Nº {ordem.numero} — {ordem.cliente_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ordem.produto_nome} · {ordem.tecido_nome}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={mesaAberta.ocupada}
                            onClick={() => handleIniciarNaMesa(ordem, mesaAberta)}
                          >
                            Iniciar
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {pinDialog}
    </div>
  );
}
