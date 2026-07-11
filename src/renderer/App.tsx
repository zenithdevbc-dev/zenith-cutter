import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { CadastrosPage } from "@/pages/CadastrosPage";
import { OrdensCortePage } from "@/pages/OrdensCortePage";
import { FilaProducaoPage } from "@/pages/FilaProducaoPage";
import { ProducaoPage } from "@/pages/ProducaoPage";
import { DbStatusCard } from "@/components/DbStatusCard";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { LoginPage } from "@/pages/LoginPage";
import { UpdateNotifier } from "@/components/UpdateNotifier";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";
import { getAllowedNavItems, type PageId } from "@/lib/navigation";

const PAGE_DESCRIPTIONS: Record<
  Exclude<PageId, "cadastros" | "ordens-corte" | "fila-producao" | "producao">,
  string
> = {
  dashboard:
    "Visão operacional de ordens por status, mesas livres/ocupadas e indicadores. Chega no Sprint 5.",
  configuracoes: "Configurações básicas do sistema. Ainda sem escopo definido.",
};

function App() {
  const { session, usuario, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  useEffect(() => {
    if (!usuario) return;
    const allowed = getAllowedNavItems(usuario.papel);
    if (!allowed.some((item) => item.id === currentPage)) {
      setCurrentPage(allowed[0]?.id ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  return (
    <>
      <Toaster />
      <UpdateNotifier />
      {loading ? (
        <div className="h-screen w-screen bg-background" />
      ) : !session ? (
        <LoginPage />
      ) : (
        <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
          {currentPage === "cadastros" ? (
            <CadastrosPage />
          ) : currentPage === "ordens-corte" ? (
            <OrdensCortePage />
          ) : currentPage === "fila-producao" ? (
            <FilaProducaoPage />
          ) : currentPage === "producao" ? (
            <ProducaoPage />
          ) : (
            <div className="flex flex-col gap-4">
              <PlaceholderPage
                title="Em construção"
                description={PAGE_DESCRIPTIONS[currentPage]}
              />
              {currentPage === "dashboard" && (
                <>
                  <DbStatusCard />
                  <SyncStatusCard />
                </>
              )}
            </div>
          )}
        </AppShell>
      )}
    </>
  );
}

export default App;
