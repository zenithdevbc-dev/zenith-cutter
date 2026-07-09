import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSync, type SyncResult } from "@/lib/sync";
import type { SyncStatus } from "@shared/ipc";

export function SyncStatusCard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  function refreshStatus() {
    window.zenith.sync.getStatus().then(setStatus);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleSyncNow() {
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await runSync();
      setLastResult(result);
    } finally {
      refreshStatus();
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Sincronização com Supabase</CardTitle>
        <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {status ? (
          <p>{status.pendingCount} alteração(ões) pendente(s) de envio.</p>
        ) : (
          <p>Carregando status...</p>
        )}
        {lastResult && (
          <p>
            Última tentativa: {lastResult.synced} enviada(s), {lastResult.failed} com erro (de{" "}
            {lastResult.attempted}).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
