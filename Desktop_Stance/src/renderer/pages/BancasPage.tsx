import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { CreateBancaDialog } from "@/components/bancas/CreateBancaDialog";
import { EditBancaDialog } from "@/components/bancas/EditBancaDialog";
import { listBancas, updateBanca } from "@/lib/bancas";
import { listRelatorioProducao } from "@/lib/relatorios";
import { STATUS_EM_ANDAMENTO } from "@/lib/relatorioProducao";
import { STATUS_ORDEM_CORTE_LABEL, STATUS_ORDEM_CORTE_VARIANT } from "@/lib/statusOrdemCorte";
import type { Banca, RelatorioProducaoLinha } from "@shared/models";

type FiltroStatus = "todas" | "ativas" | "inativas";

/**
 * "Controle" das bancas (pedido do usuário, 2026-07-24 — bancas não
 * apareciam em nenhum lugar do setor de Produção): além do cadastro,
 * esta página mostra quantas peças cada banca tem em produção agora
 * (mesma definição de STATUS_EM_ANDAMENTO do Relatório de Produção) e
 * permite abrir a lista das ordens por trás desse número — sem IPC
 * novo, reaproveita `listRelatorioProducao()`.
 */
export function BancasPage() {
  const [bancas, setBancas] = useState<Banca[] | null>(null);
  const [producao, setProducao] = useState<RelatorioProducaoLinha[] | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("todas");
  const [bancaAberta, setBancaAberta] = useState<Banca | null>(null);

  useEffect(() => {
    listBancas()
      .then(setBancas)
      .catch(() => toast.error("Não foi possível carregar a lista de terceiros."));
    listRelatorioProducao()
      .then(setProducao)
      .catch(() => toast.error("Não foi possível carregar a produção dos terceiros."));
  }, []);

  function upsertLocal(banca: Banca) {
    setBancas((prev) => {
      if (!prev) return [banca];
      const idx = prev.findIndex((b) => b.id === banca.id);
      if (idx === -1) return [...prev, banca].sort((a, b) => a.nome.localeCompare(b.nome));
      const next = [...prev];
      next[idx] = banca;
      return next;
    });
  }

  async function handleToggleAtivo(banca: Banca, ativo: boolean) {
    try {
      const updated = await updateBanca(banca.id, { ativo });
      upsertLocal(updated);
      toast.success(ativo ? "Terceiro reativado." : "Terceiro desativado.");
    } catch {
      toast.error("Não foi possível atualizar o status do terceiro.");
    }
  }

  const producaoPorBanca = useMemo(() => {
    const mapa = new Map<string, RelatorioProducaoLinha[]>();
    for (const linha of producao ?? []) {
      if (!linha.banca_id || !STATUS_EM_ANDAMENTO.includes(linha.status)) continue;
      const lista = mapa.get(linha.banca_id) ?? [];
      lista.push(linha);
      mapa.set(linha.banca_id, lista);
    }
    return mapa;
  }, [producao]);

  const filtradas = useMemo(() => {
    if (!bancas) return null;
    const termo = busca.trim().toLowerCase();
    return bancas.filter((b) => {
      if (statusFiltro === "ativas" && !b.ativo) return false;
      if (statusFiltro === "inativas" && b.ativo) return false;
      if (!termo) return true;
      return (
        b.nome.toLowerCase().includes(termo) ||
        (b.responsavel ?? "").toLowerCase().includes(termo) ||
        (b.telefone ?? "").toLowerCase().includes(termo) ||
        (b.email ?? "").toLowerCase().includes(termo)
      );
    });
  }, [bancas, busca, statusFiltro]);

  const ordensDaBancaAberta = bancaAberta ? (producaoPorBanca.get(bancaAberta.id) ?? []) : [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Terceiros</CardTitle>
        <CreateBancaDialog onCreated={upsertLocal} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 gap-2">
          <Input
            placeholder="Pesquisar por nome, responsável, telefone ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as FiltroStatus)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="ativas">Ativas</SelectItem>
              <SelectItem value="inativas">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtradas === null ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum terceiro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Tipo de serviço</TableHead>
                  <TableHead>Em produção</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((banca) => {
                  const ordensBanca = producaoPorBanca.get(banca.id) ?? [];
                  const pecas = ordensBanca.reduce((soma, l) => soma + l.quantidade_total, 0);
                  return (
                    <TableRow key={banca.id}>
                      <TableCell className="font-medium">{banca.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {banca.responsavel ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {banca.telefone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {banca.whatsapp ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {banca.tipo_servico ?? "—"}
                      </TableCell>
                      <TableCell>
                        {ordensBanca.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBancaAberta(banca)}
                            className="underline-offset-2 hover:underline"
                          >
                            <Badge variant="production">
                              {ordensBanca.length} ordem(ns) · {pecas} peça(s)
                            </Badge>
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={banca.ativo}
                          onCheckedChange={(checked) => handleToggleAtivo(banca, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditBancaDialog banca={banca} onUpdated={upsertLocal} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

      <Dialog open={bancaAberta !== null} onOpenChange={(v) => !v && setBancaAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produção em andamento — {bancaAberta?.nome}</DialogTitle>
          </DialogHeader>
          {ordensDaBancaAberta.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ordem em produção neste terceiro no momento.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ordensDaBancaAberta.map((linha) => (
                <div
                  key={linha.ordem_id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Nº {linha.numero} — {linha.cliente_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {linha.tecido_nome} · {linha.quantidade_total} peça(s)
                    </p>
                  </div>
                  <Badge variant={STATUS_ORDEM_CORTE_VARIANT[linha.status]}>
                    {STATUS_ORDEM_CORTE_LABEL[linha.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
