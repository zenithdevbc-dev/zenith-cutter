import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BackupCard() {
  const [salvando, setSalvando] = useState(false);

  async function handleBackup() {
    setSalvando(true);
    try {
      const caminho = await window.zenith.backup.run();
      if (caminho) {
        toast.success(`Backup salvo em ${caminho}`);
      }
    } catch {
      toast.error("Não foi possível salvar o backup.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Backup do banco local</CardTitle>
        <Button size="sm" variant="outline" onClick={handleBackup} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar backup..."}
        </Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          Gera uma cópia completa do banco de dados local (SQLite) num
          arquivo à sua escolha — útil antes de reinstalar o app ou trocar
          de computador.
        </p>
      </CardContent>
    </Card>
  );
}
