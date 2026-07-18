import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSyncStatus, syncManager } from "@/lib/syncManager";
import type { PendingSyncItem } from "@shared/ipc";

const OPERACAO_LABEL: Record<PendingSyncItem["operation"], string> = {
  insert: "Criação",
  update: "Edição",
  delete: "Exclusão",
};

/**
 * Itens que esgotaram as tentativas automáticas (Sprint 6 — "resolução
 * de erros"). Fica oculto quando não há nenhum, pra não virar ruído
 * numa tela que na maior parte do tempo não tem nada de errado.
 */
export function SyncErrorsList() {
  const status = useSyncStatus();
  const [itens, setItens] = useState<PendingSyncItem[] | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  useEffect(() => {
    window.zenith.sync.listErrors().then(setItens);
  }, [status.errorCount, status.syncing]);

  if (!itens || itens.length === 0) return null;

  async function handleRetry(id: number) {
    setRetryingId(id);
    try {
      await syncManager.retryError(id);
    } finally {
      setRetryingId(null);
    }
  }

  async function handleRetryAll() {
    setRetryingAll(true);
    try {
      await syncManager.retryAllErrors();
    } finally {
      setRetryingAll(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Erros de Sincronização</CardTitle>
        <Button size="sm" variant="outline" onClick={handleRetryAll} disabled={retryingAll}>
          {retryingAll ? "Tentando..." : "Tentar novamente todos"}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tabela</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Erro</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.tableName.replace(/_/g, " ")}
                </TableCell>
                <TableCell>{OPERACAO_LABEL[item.operation]}</TableCell>
                <TableCell className="max-w-xs truncate text-destructive">
                  {item.errorMessage ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">{item.retryCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(item.id)}
                    disabled={retryingId === item.id || retryingAll}
                  >
                    {retryingId === item.id ? "Tentando..." : "Tentar novamente"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
