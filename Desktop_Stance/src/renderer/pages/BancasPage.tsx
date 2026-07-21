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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Banca } from "@shared/models";

type FiltroStatus = "todas" | "ativas" | "inativas";

export function BancasPage() {
  const [bancas, setBancas] = useState<Banca[] | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("todas");

  useEffect(() => {
    listBancas()
      .then(setBancas)
      .catch(() => toast.error("Não foi possível carregar a lista de bancas."));
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
      toast.success(ativo ? "Banca reativada." : "Banca desativada.");
    } catch {
      toast.error("Não foi possível atualizar o status da banca.");
    }
  }

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

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between">
        <CardTitle>Bancas</CardTitle>
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
            <p className="text-sm text-muted-foreground">Nenhuma banca encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Tipo de serviço</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((banca) => (
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
                      <Switch
                        checked={banca.ativo}
                        onCheckedChange={(checked) => handleToggleAtivo(banca, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditBancaDialog banca={banca} onUpdated={upsertLocal} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
