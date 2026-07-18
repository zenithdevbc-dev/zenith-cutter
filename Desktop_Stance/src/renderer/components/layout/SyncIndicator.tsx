import { AlertCircle, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useSyncStatus } from "@/lib/syncManager";
import { cn } from "@/lib/utils";

/**
 * Indicador compacto de conectividade/sincronização no header (Sprint
 * 6) — sempre visível (é status de conectividade, não uma
 * microinteração cosmética que pediria "não exagerar").
 */
export function SyncIndicator() {
  const status = useSyncStatus();

  if (!status.online) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CloudOff className="size-4" />
        Offline
      </span>
    );
  }

  if (status.syncing) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" />
        Sincronizando...
      </span>
    );
  }

  if (status.errorCount > 0) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-destructive">
        <AlertCircle className="size-4" />
        {status.errorCount} com erro
        {status.pendingCount > 0 ? ` · ${status.pendingCount} pendente(s)` : ""}
      </span>
    );
  }

  if (status.pendingCount > 0) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4" />
        {status.pendingCount} pendente(s)
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1.5 text-sm text-muted-foreground")}>
      <span className="size-2 rounded-full bg-emerald-500" />
      Sincronizado
    </span>
  );
}
