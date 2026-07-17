import { SyncStatusCard } from "@/components/SyncStatusCard";

export function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Sincronização</h2>
        <p className="text-sm text-muted-foreground">
          Status da fila de sincronização com o Supabase.
        </p>
      </div>
      <SyncStatusCard />
    </div>
  );
}
