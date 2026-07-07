import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncStatus } from "@shared/ipc";

export function SyncStatusCard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    window.zenith.sync.getStatus().then(setStatus);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sincronização com Supabase</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {status ? (
          <p>{status.pendingCount} alteração(ões) pendente(s) de envio.</p>
        ) : (
          <p>Carregando status...</p>
        )}
      </CardContent>
    </Card>
  );
}
