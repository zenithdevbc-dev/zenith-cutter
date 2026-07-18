import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSyncStatus, syncManager } from "@/lib/syncManager";

export function SyncStatusCard() {
  const status = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await syncManager.syncNow("manual");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Sincronização com Supabase</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncNow}
          disabled={syncing || status.syncing || !status.online}
        >
          {status.syncing || syncing ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        {!status.online && (
          <p className="text-destructive">
            Sem conexão — as alterações continuam sendo salvas localmente e
            serão enviadas automaticamente assim que a internet voltar.
          </p>
        )}
        <p>{status.pendingCount} alteração(ões) pendente(s) de envio.</p>
        {status.errorCount > 0 && (
          <p className="text-destructive">
            {status.errorCount} item(ns) com erro — veja "Erros de
            Sincronização" abaixo.
          </p>
        )}
        {status.lastSyncAt && (
          <p>
            Última sincronização: {new Date(status.lastSyncAt).toLocaleString("pt-BR")}
            {status.lastResult &&
              ` — ${status.lastResult.synced} enviada(s), ${status.lastResult.failed} com erro (de ${status.lastResult.attempted}).`}
          </p>
        )}
        {status.online && status.backoffMs > 30_000 && (
          <p>
            Próxima tentativa automática em até {Math.round(status.backoffMs / 1000)}s
            (recuo automático por instabilidade de conexão).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
