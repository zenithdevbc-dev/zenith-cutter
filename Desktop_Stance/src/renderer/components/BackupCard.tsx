import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePinConfirm } from "@/components/usePinConfirm";

export function BackupCard() {
  const { confirm: confirmPin, dialog: pinDialog } = usePinConfirm();
  const [salvando, setSalvando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

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

  async function handleRestore() {
    // Restaurar substitui todo o banco local atual — mesma barreira de
    // PIN das demais ações de risco do app (CLAUDE.md 3.1).
    if (!(await confirmPin())) return;
    setRestaurando(true);
    try {
      const resultado = await window.zenith.backup.restore();
      if (resultado === "restored") {
        toast.success(
          "Backup restaurado. Feche e abra o Zenith Cutter novamente para aplicar.",
          { duration: 10_000 },
        );
      } else if (resultado === "invalid") {
        toast.error("Arquivo inválido — selecione um backup gerado pelo Zenith Cutter.");
      }
      // "cancelled": o usuário desistiu no seletor de arquivo, nada a fazer.
    } catch {
      toast.error("Não foi possível restaurar o backup.");
    } finally {
      setRestaurando(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Backup do banco local</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Gera uma cópia completa do banco de dados local (SQLite) num
              arquivo à sua escolha — útil antes de reinstalar o app ou trocar
              de computador.
            </p>
            <Button size="sm" variant="outline" onClick={handleBackup} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar backup..."}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Restaura um backup salvo anteriormente,{" "}
              <strong className="text-destructive">substituindo todos os dados locais atuais</strong>.
              Use só em recuperação de desastre (banco corrompido, troca de
              computador) — alterações feitas depois do backup e ainda não
              sincronizadas serão perdidas.
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRestore}
              disabled={restaurando}
            >
              {restaurando ? "Restaurando..." : "Restaurar backup..."}
            </Button>
          </div>
        </CardContent>
      </Card>
      {pinDialog}
    </>
  );
}
