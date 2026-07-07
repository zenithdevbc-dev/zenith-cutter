import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DbStatus } from "@shared/ipc";

export function DbStatusCard() {
  const [status, setStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    window.zenith.db.getStatus().then(setStatus);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Banco de dados local</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        {status ? (
          <>
            <p>Versão do schema: {status.schemaVersion}</p>
            <p className="break-all">Arquivo: {status.path}</p>
          </>
        ) : (
          <p>Carregando status...</p>
        )}
      </CardContent>
    </Card>
  );
}
