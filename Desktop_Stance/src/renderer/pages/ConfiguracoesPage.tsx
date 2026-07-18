import { SyncStatusCard } from "@/components/SyncStatusCard";
import { SyncErrorsList } from "@/components/SyncErrorsList";
import { SyncLogTable } from "@/components/SyncLogTable";
import { BackupCard } from "@/components/BackupCard";

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
      <SyncErrorsList />
      <SyncLogTable />

      <div>
        <h2 className="text-lg font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">
          Cópia de segurança do banco de dados local.
        </p>
      </div>
      <BackupCard />
    </div>
  );
}
