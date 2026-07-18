import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSyncStatus } from "@/lib/syncManager";
import type { SyncLogEntry, SyncLogTrigger } from "@shared/ipc";

const TRIGGER_LABEL: Record<SyncLogTrigger, string> = {
  manual: "Manual",
  login: "Login",
  auto: "Automática",
  reconexao: "Reconexão",
};

export function SyncLogTable() {
  const status = useSyncStatus();
  const [log, setLog] = useState<SyncLogEntry[] | null>(null);

  useEffect(() => {
    window.zenith.sync.logList().then(setLog);
    // status.lastSyncAt muda a cada execução do motor — é o gatilho pra
    // buscar o log atualizado sem precisar de polling.
  }, [status.lastSyncAt]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Histórico de Sincronização</CardTitle>
      </CardHeader>
      <CardContent>
        {!log || log.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sincronização registrada ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Enviados</TableHead>
                <TableHead>Com erro</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.criadoEm).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{TRIGGER_LABEL[entry.trigger]}</TableCell>
                  <TableCell>{entry.synced}</TableCell>
                  <TableCell>{entry.failed}</TableCell>
                  <TableCell>{entry.attempted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
